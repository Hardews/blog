---
title: 浅析 WaitGroup
tags: 
  - 2023
  - Golang
  - WaitGroup
date: 2023-8-26
categories: blog
timeline: article
---



# sync.WaitGroup

`sync.WaitGroup` 是 Golang 中常用的并发措施，我们可以用它来等待一批 Goroutine 结束。

WaitGroup 的源码也非常简短，抛去注释外也就 100 行左右的代码。但即使是这 100 行代码，里面也有着关乎内存优化、并发安全考虑等各种性能优化手段。



<!--truncate-->

## WaitGroup简单介绍

要完成一个大的任务，需要使用并发的goroutine执行三个小任务，只有这三个小任务都完成，才能去执行后面的任务。如果通过轮询的方式定时询问三个小任务是否完成，会存在两个问题:
一是，性能比较低，因为三个小任务可能早就完成了，却要等很长时间才被轮询到；二是，会有很多无谓的轮询，空耗CPU资源。所以，这个时候WaitGroup并发原语就比较有效了，它可以阻塞等待的goroutine。等三个小任务都完成了，再即时唤醒它们。



waitgourp包为我们提供了三个api给我们用于控制协程间的同步，如下:

```go
func (wg *WaitGroup) Add(delta int)  // 增加WaitGroup中的子goroutine计数值
func (wg *WaitGroup) Done()          // 当子goroutine任务完成，将计数值减1
func (wg *WaitGroup) Wait()          // 阻塞调用此方法的goroutine，直到计数值为0
```

使用WaitGroup编排这类任务的常用方式。而“这类任务”指的就是，需要启动多个goroutine执行任务，主goroutine需要等待子goroutine都完成后才能继续执行。



## WaitGroup的实现

### WaitGroup结构体

```go
type WaitGroup struct {
	noCopy noCopy

	// 64位值:高32位为counter计数器，低32位为waiter计数器。
    // 64位原子操作需要64位对齐，但32位编译器只保证64位字段是32位对齐的。
    // 因此，在32位体系结构上，我们需要检入state()，查看state1是否对齐，并在需要时动态地“交换”字段顺序。
	state1 uint64 // counter计数器+waiter计数器
    
	state2 uint32 // sema信号量
}
```

其中 `noCopy` 是 golang 源码中检测禁止拷贝的技术。如果程序中有 WaitGroup 的赋值行为，使用 `go vet` 检查程序时，就会发现有报错。但需要注意的是，noCopy 不会影响程序正常的编译和运行。

`state1 uint64` 和`state2 uint32`两个字段包含了 WaitGroup 的所有状态数据。这两个字段的整个设计其实非常复杂，为了便于快速理解 WaitGroup 的主流程，我们将在后面部分单独剖析 。

为了便于理解 WaitGroup 的整个实现过程，**我们暂时先不考虑内存对齐和并发安全等方面因素**。那么 WaitGroup 可以近似的看做以下代码：

```go
type WaitGroup struct {
    counter int32
    waiter  uint32
    sema    uint32
}
```

其中:

- `counter`和`waiter`是一个64位的整型(即`state1`)，高32位是`counter`，低32位是`waiter`。
- *`counter` 代表目前尚未完成的任务的个数。`WaitGroup.Add(n)` 将会导致 `counter += n`, 而 `WaitGroup.Done()` 将导致 `counter--`。*
- `waiter` 代表目前已调用 `WaitGroup.Wait` 的 goroutine 的个数。
- `sema` 对应于 golang 中 runtime 内部的信号量的实现。WaitGroup 中会用到 sema 的两个相关函数，`runtime_Semacquire` 和 `runtime_Semrelease`。`runtime_Semacquire` 表示增加一个信号量，并挂起 当前 goroutine。`runtime_Semrelease` 表示减少一个信号量，并唤醒 sema 上其中一个正在等待的 goroutine。



### Waitgroup调用过程的简单描述

WaitGroup 的整个调用过程可以简单地描述成下面这样：

1. 当调用 `WaitGroup.Add(n)` 时，counter 将会自增: `counter += n`

2. 当调用 `WaitGroup.Wait()` 时，会将 `waiter++`。同时调用 `runtime_Semacquire(semap)`, 增加信号量，并挂起当前 goroutine。

3. 当调用 `WaitGroup.Done()` 时，将会 `counter--`。如果自减后的 counter 等于 0，说明 WaitGroup 的等待过程已经结束，则需要调用 `runtime_Semrelease `释放信号量，唤醒正在 `WaitGroup.Wait` 的 goroutine。

以上就是 WaitGroup 实现过程的简略版。但实际上，WaitGroup 在实现过程中对并发性能以及内存占用优化上，都有一些非常巧妙的设计点，我们接下来要着重讨论下。



#### 信号量的概念

> 信号量的概念是由[荷兰](https://zh.wikipedia.org/wiki/荷兰)计算机科学家[艾兹赫尔·戴克斯特拉](https://zh.wikipedia.org/wiki/艾兹赫尔·戴克斯特拉)（Edsger W. Dijkstra）发明的[[1\]](https://zh.wikipedia.org/wiki/信号量#cite_note-1)，广泛的应用于不同的[操作系统](https://zh.wikipedia.org/wiki/操作系统)中。在系统中，给予每一个[进程](https://zh.wikipedia.org/wiki/行程)一个信号量，代表每个进程目前的状态，未得到控制权的进程会在特定地方被强迫停下来，等待可以继续进行的信号到来。**如果信号量是一个任意的整数，通常被称为计数信号量（Counting semaphore）**，或一般信号量（general semaphore）；如果信号量只有二进制的0或1，称为二进制信号量（binary semaphore）。

**waitgroup这里用的就是计数信号量**。



### Waitgroup获取state的方法

```go
func (wg *WaitGroup) state() (statep *uint64, semap *uint32)
```

waitgroup里有一个方法，是用来获取counter，waiter，sema的值的。

```go
// state返回存储在wg.state*中的state和sema字段的指针。
func (wg *WaitGroup) state() (statep *uint64, semap *uint32) {
    // if语句中的条件为true则证明是64位对齐
	if unsafe.Alignof(wg.state1) == 8 || uintptr(unsafe.Pointer(&wg.state1))%8 == 0 {
		// 如果是64位系统就不需要做任何额外的事情
		return &wg.state1, &wg.state2
	} else {
		// state1是32位对齐的但不是64位对齐的:这意味着
		// (&state1)+4为64位对齐。
		state := (*[3]uint32)(unsafe.Pointer(&wg.state1))
		return (*uint64)(unsafe.Pointer(&state[1])), &state[0]
	}
}
```



即根据64位对齐或是32位对齐来返回state1和state2。



如果类型 `t` 的对齐保证是 `n`，那么类型 `t` 的每个值的地址在运行时必须是 `n` 的倍数。

Golang 官方文档中也给出了 判断当前变量是 32 位对齐还是 64 位对齐的方法:

```go
uintptr(unsafe.Pointer(&x)) % unsafe.Alignof(x) == 0
```

**unsafe.Alignof** 函数**返回对应参数的类型需要对齐的倍数**。

**uintptr**是golang的内置类型，能存储指针的整型。



#### 什么是内存对齐

简单来说，操作系统的cpu不是一个字节一个字节访问内存的，是按2,4,8这样的字长来访问的。

所以当处理器从存储器子系统读取数据至寄存器，或者，写寄存器数据到存储器，传送的数据长度通常是字长。

如32位系统访问粒度是4字节（bytes），64位系统的是8字节。

当被访问的数据长度为 `n` 字节且该数据地址为`n`字节对齐，那么操作系统就可以一次定位到数据，这样会更加高效。无需多次读取、处理对齐运算等额外操作。



#### 为什么要判断是多少位对齐？

主要原因是在 32 位系统下，如果使用 atomic 对 64 位变量进行原子操作，调用者需要自行保证变量的 64 位对齐，否则将会出现异常。golang 的官方文档 [sync/atomic/#pkg-note-BUG]([atomic package - sync/atomic - Go Packages](https://pkg.go.dev/sync/atomic#pkg-note-BUG)) 原文是这么说的：

> On ARM, x86-32, and 32-bit MIPS, it is the caller’s responsibility to arrange for 64-bit alignment of 64-bit words accessed atomically. 

翻译一下就是：

> 在ARM、x86-32和32位MIPS上，调用者负责安排以原子方式访问的64位字的64位对齐。



如果是32位对齐，go官方采用以下方法获取一个长度为3的state数组，通过将sema信号量放在第二位从而使其后面两位是64位对齐的。

```go
state := (*[3]uint32)(unsafe.Pointer(&wg.state1))
```



所以是 32 位对齐时，我们把`state`数组第 1 位作为对齐的 padding，因为获取到的 `state` 本身是 uint32 的数组，所以数组第一位也有 32 位。这样就保证了把数组后两位看做统一的 64 位整数时是64位对齐的。



### Waitgroup.Add(n int)

Add方法主要操作的state1字段中计数值部分。当Add方法被调用时，首先会将delta参数值左移32位(计数值在高32位)，然后内部通过原子操作将这个值加到计数值上。需要注意的是，delta的取值范围可正可负，因为调用Done()方法时，内部通过Add(-1)方法实现的。

为了更好的明白这段代码，去掉关于竟态检测的代码后如下。竟态检测的话只在运行时增加-race参数时生效，下面的代码也会去掉。

```go
func (wg *WaitGroup) Add(delta int) {
	statep, semap := wg.state()
	state := atomic.AddUint64(statep, uint64(delta)<<32) // 将参数delta+到counter上
	v := int32(state >> 32) // counter
	w := uint32(state) // waiter
    
    // counter不能为负数
	if v < 0 {
		panic("sync: negative WaitGroup counter")
	}
    
    // 这里是检测如果wait和add两个方法并发调用的话就会panic
	if w != 0 && delta > 0 && v == int32(delta) {
		panic("sync: WaitGroup misuse: Add called concurrently with Wait")
	}
    
    // 此时应该是正常调用了add后，counter，waiter数量不为0，直接返回
	if v > 0 || w == 0 {
		return
	}
	
    // 这里也是检测并发，相当于再检查一次
	if *statep != state {
		panic("sync: WaitGroup misuse: Add called concurrently with Wait")
	}
	
     // 可以执行到这里说明counter为0，且waiter大于0，需要唤醒所有的等待者，并把系统置为初始状态（0状态）
  
  	 // 将计数值和等待者数量都置为0
	*statep = 0
    
	for ; w != 0; w-- {
        // func runtime_Semrelease(s *uint32, handoff bool, skipframes int)
        // Semrelease会自动增加*s并通知一个被Semacquire阻塞的等待的goroutine(wait)
        // 它是一个简单的唤醒原语，用于同步
        // 如果handoff为true, 传递信号到队列头部的waiter
        // skipframes是跟踪过程中要省略的帧数，从这里开始计算
		runtime_Semrelease(semap, false, 0)
	}
}
```



### Waitgroup.Done()

此方法实际上就是调用Add，实现-1，如下

```go
func (wg *WaitGroup) Done() {
	wg.Add(-1)
}
```



### Waitgroup.Wait()

此方法的用处就是告诉程序现在应该等待添加的任务全部完成。

**wait实现思路：**

不断检查state值。如果其中的计数值为零，则说明所有的子goroutine已全部执行完毕，调用者不必等待，直接返回。如果计数值大于零，说明此时还有任务没有完成，那么调用者变成等待者，需要加入wait队列，并且阻塞自己。

```go
func (wg *WaitGroup) Wait() {
    // 复合值statep: counter 现有的任务数, waiter 等待的任务
    // semap 即sema 信号量
	statep, semap := wg.state()
	for {
		state := atomic.LoadUint64(statep) // 原子操作获取复合值
		v := int32(state >> 32) // 获取counter
		w := uint32(state) // 获取waiter
		if v == 0 {
			// counter为0，不需要等待了
			return
		}
		// waiter数递增
		if atomic.CompareAndSwapUint64(statep, state, state+1) {
            // Semacquire等待*semap > 0，然后原子递减它。
			// 它是一个简单的睡眠原语，用于同步
			runtime_Semacquire(semap)
            
            // 此时已经被唤醒
            // 如果此时复合值不为0
            // 在所有任务未完成后就进行了waitgroup的复用或者说是唤醒，会panic
			if *statep != 0 {
				panic("sync: WaitGroup is reused before previous Wait has returned")
			}
            
            // 检查无误后返回（退出）
			return
		}
	}
}
```



## 一些补充

### Waitgroup的内存优化

- go官方用了内存对齐去进行内存优化。
- 并且 WaitGroup 是可以复用的，并且做了相关的错误检查（即在没结束时就进行了复用就会panic）。
- 用到了信号量而并非加锁操作来进行并发的支持。



### Waitgroup怎么做到的并发安全

- 主要是用到了原子操作（atocmic），从操作系统底层来操作counter，waiter这样的变量，比如`counter+=n`时的`add`操作用的是`atomic.AddUint64`，waiter++用的是CAS操作，获取state的值时用的是`atomic.LoadUint64`，不仅做到了并发安全，并且实现了无锁化改善了运行效率。
- 并且state的设计时waiter和counter是一个64位的整型，因为这两个值的加减和判断都可能会导致并发，如果将他们分成两个32位的整型可能就会导致读取counter的时候waiter++，从而导致数据的不一致。这是个微妙的设计，使这两个变量可以并发安全。



## 总结

- sync.WaitGroup.Add可以传入任意的整数，但是必须保证Counter为非负数，当Counter为零时，会唤醒正在等待的Goroutine
- sync.WaitGroup.Done只是对Add方法的简单封装，本质上是Add(-1)
- 可以同时有多个 Goroutine 等待当前的sync.WaitGroup的Counter归零，而当Counter归零时，这些等待的Groutine会被同时唤醒
- Waitgroup 虽然只有 100 行左右的代码。作为语言的内置库，我们从中可以看出作者对每个细节的极致打磨，非常精细的针对场景优化性能，这也给我们写程序带来了很多启发。



## Reference

[信号量 - 维基百科 (wikipedia.org)](https://zh.wikipedia.org/wiki/信号量)

[FreeRTOS系列|计数信号量](https://blog.csdn.net/Chuangke_Andy/article/details/115700817)

[详解 Go 中 WaitGroup 源码设计](https://zhuanlan.zhihu.com/p/408383454)

[Go之聊聊struct的内存对齐](http://blog.newbmiao.com/2020/02/10/dig101-golang-struct-memory-align.html)

[Go并发编程-WaitGroup的设计实现](https://zhuanlan.zhihu.com/p/261024816)