---
title: go channel 使用及实现
tags: 
  - 2023
  - Golang
  - 并发控制
  - channel
date: 2023-11-9
categories: blog
timeline: article
---



# go channel

channel 是 go 语言中并发控制的一大手段，可以通过 channel 来进行协程之间的通信。

<!--truncate-->

## channel 的使用

在研究源码之前，复习一下 channel 的基本使用方法。

channel 分为无缓存和有缓存的 channel，其中，

- 无缓存的 channel 在读取和写入时都会造成阻塞，只有当双方都准备好时，才会持续写入和读取。换句话说，无缓存的 channel 不能同步读写，只能异步读写。
- 有缓存的 channel 在写入时不会阻塞，也就是说，有缓存的 channel 可以实现同步读写。

可以看以下两个示例：

### 无缓存的 channel

死锁

```go
var ch = make(chan int)
ch <- 2
<-ch
```

执行上述伪代码会报错：`fatal error: all goroutines are asleep - deadlock!`

这是因为在第二行，没有缓存的 channel 就会阻塞，等待一个 goroutine 将其数据读出来。负责读取的第三句也在等待读取数据，但是因为前面一直阻塞，所以无法读取到数据，导致死锁。

正确的姿势应该是：

```go
var ch = make(chan int)
go func(){
  ch <- 2  
}()
fmt.Println(<-ch)
```

### 有缓存的 channel

对于有缓存的例子：

```go
var ch = make(chan int, 1)
ch <- 2
<-ch
```

### 协程之间的通信

配合 select 关键字使用，使协程之间通过 channel 通信。下面是一个例子：

```go
func main() {
	var wg = sync.WaitGroup{}

	var ch1 = make(chan int)
	var ch2 = make(chan int)
	go func() {
		wg.Add(1)
		fmt.Println("开始协程 1")
		defer func() {
			fmt.Println("退出协程 1")
			wg.Done()
		}()
		for i := 0; ; i++ {
			select {
			case val := <-ch1:
				fmt.Println("ch1 接收到数据 ", val)
				return
			case ch2 <- i:
				time.Sleep(time.Second)
				fmt.Println("发送数据到 ch2, ", i)
			}
		}
	}()

	go func() {
		wg.Add(1)
		fmt.Println("开始协程 2")
		defer func() {
			fmt.Println("退出协程 2")
			wg.Done()
		}()
		for {
			select {
			case val := <-ch2:
				fmt.Println("ch2 接收到数据 ", val)
				if val == 3 {
					ch1 <- val
					return
				}
			}
		}
	}()

    // 这里是为了让协程能够顺利执行起来
	time.Sleep(time.Second)
	wg.Wait()
}
```

输出：

```go
开始协程 1
开始协程 2
ch2 接收到数据  0
发送数据到 ch2,  0
ch2 接收到数据  1
发送数据到 ch2,  1
ch2 接收到数据  2
发送数据到 ch2,  2
ch2 接收到数据  3 
发送数据到 ch2,  3
退出协程 2       
ch1 接收到数据  3
退出协程 1 
```



## channel 的实现

在 `runtime/chan.go` 文件中，可以看到 channel 具体实现。

### 数据结构

#### hchan

```go
type hchan struct {
	qcount   uint           // 在 channel 中有多少数据
	dataqsiz uint           // 循环队列的长度
	buf      unsafe.Pointer // 指向 channel 缓冲区的指针
	elemsize uint16
	closed   uint32 // 是否为关闭状态
	elemtype *_type // channel 中元素的类型
	sendx    uint   // 等待发送信息 goroutine 的第一个下标
	recvx    uint   // 等待接收信息 goroutine 的第一个下标
	recvq    waitq  // 阻塞等待接收信息的 goroutine 
	sendq    waitq  // 阻塞等待发送信息的 goroutine 

	lock mutex // 锁，为了防止同时读写
}
```

#### waitq

```go
type waitq struct {
	first *sudog // 头指针
	last  *sudog // 尾指针
}
```

#### sudog

这个结构体在前面讲 sema 的文章中有所提及。

```go
type sudog struct {
	g *g // g 表示 goroutine，这是一个指向一个 goroutine 结构体的指针

	next *sudog // 下一个 sudog，可以认为是下一个要执行操作的 goroutine
	prev *sudog
	elem unsafe.Pointer // 协程等待信号量的指针

	acquiretime int64
	releasetime int64
	ticket      uint32 // 优先级

	isSelect bool // 是否在 select 流程中

	// success 是否通信成功
    // 如果是因为收到了一个值，将这个 goroutine 唤醒，则为 true
    // 如果是因为 channel 关闭，导致唤醒，为 false
	success bool

	parent   *sudog // 一个平衡树，树中的每个节点都是一个队列
	waitlink *sudog // g.waiting list or semaRoot
	waittail *sudog // semaRoot
	c        *hchan // 指向使用的 channel
}
```

通过上述结构体可以看出，channel 主要是由 **一个循环队列 + 两个链表** 实现的。

### 初始化

常见的 channel 初始化方法是：

```go
var ch = make(chan type)
```

当我们调用 `make(chan type)` 时，对应的源码是：

```go
func makechan(t *chantype, size int) *hchan {
	elem := t.elem

	// 检查是否在合适的内存范围内
	if elem.size >= 1<<16 {
		throw("makechan: invalid channel element type")
	}
    // 内存对齐检查
    // 前者代表：channel 结构体大小要是 8 的倍数
    // 后者代表：channel 中元素的大小不能大于 8
	if hchanSize%maxAlign != 0 || elem.align > maxAlign {
		throw("makechan: bad alignment")
	}

    // mem 表示分配这个 channel 中的元素使用的缓冲区大小
    // overflow 是一个 bool 值，表示缓冲区是否溢出
	mem, overflow := math.MulUintptr(elem.size, uintptr(size))
	if overflow || mem > maxAlloc-hchanSize || size < 0 {
        // maxAlloc-hchanSize 是 channel 可使用的最大缓冲区大小
		panic(plainError("makechan: size out of range"))
	}

	// 初始化一个 channel
    // 下面的 hchanSize 代表一个 channel 需要使用的内存大小
	var c *hchan
	switch {
	case mem == 0:
		// 这是一个无缓存的 channel，直接分配内存
		c = (*hchan)(mallocgc(hchanSize, nil, true))
		// 这是方便竟态检测使用的，不用管
		c.buf = c.raceaddr()
	case elem.ptrdata == 0:
		// channel 中的元素不会包含指针类型
		// 分配大小为 hchanSize+mem 的内存
		c = (*hchan)(mallocgc(hchanSize+mem, nil, true))
		c.buf = add(unsafe.Pointer(c), hchanSize)
	default:
		// 元素包含指针
		c = new(hchan)
		c.buf = mallocgc(mem, elem, true)
	}

    // 计算元素大小
	c.elemsize = uint16(elem.size)
    // 元素类型
	c.elemtype = elem
    // 队列长度
	c.dataqsiz = uint(size)
	lockInit(&c.lock, lockRankHchan)

	if debugChan {
		print("makechan: chan=", c, "; elemsize=", elem.size, "; dataqsiz=", size, "\n")
	}
	return c
}
```

### 发送数据

对于发送，可以看 chansend 代码。

在此之前，讲一下两个函数：

- gopark，将当前 goroutine 变为待唤醒状态
- goready，将当前 goroutine 唤醒

下面代码将一些无关紧要的去掉了（比如竟态检测，debug 打印

```go
func chansend(c *hchan, ep unsafe.Pointer, block bool, callerpc uintptr) bool {
    // 检查
	if c == nil {
		if !block {
            // 没有可做的事
			return false
		}
        // 挂起的 goroutine 为 nil，回调函数为 nil
		gopark(nil, nil, waitReasonChanSendNilChan, traceEvGoStop, 2)
        // 抛出错误，不可达
		throw("unreachable")
	}

	if !block && c.closed == 0 && full(c) {
		return false
	}

	var t0 int64
	if blockprofilerate > 0 {
		t0 = cputicks()
	}

/* 有缓冲区的情况 */
    // 先上锁，防止有其他 goroutine 操作
	lock(&c.lock)

    // 管道是否被关闭
	if c.closed != 0 {
		unlock(&c.lock)
		panic(plainError("send on closed channel"))
	}

    // 从等待队列中，取出一个 goroutine 发送信息
	if sg := c.recvq.dequeue(); sg != nil {
		send(c, sg, ep, func() { unlock(&c.lock) }, 3)
		return true
	}

    // 对于有缓存的 channel
    // 如果缓冲区还有位置，那么我们进入这个流程进行发送
	if c.qcount < c.dataqsiz {
        // 获取缓冲区指针
		qp := chanbuf(c, c.sendx)
        
        // 将要发送的数据拷贝到缓冲区中，并让 qp 指针向后移动
		typedmemmove(c.elemtype, qp, ep)
        // 等待的 goroutine 数 + 1
		c.sendx++
        // 下标到达边界
		if c.sendx == c.dataqsiz {
            // 重新循环
			c.sendx = 0
		}
        // 队列中的元素加一
		c.qcount++
		unlock(&c.lock)
		return true
	}

	if !block {
		unlock(&c.lock)
		return false
	}

/* 无缓冲区的情况 */
    // 先获取发送数据使用的 goroutine
	gp := getg()
    // 获取一个 sudog
	mysg := acquireSudog()
	mysg.releasetime = 0
	if t0 != 0 {
		mysg.releasetime = -1
	}
    
	mysg.elem = ep
	mysg.waitlink = nil
	mysg.g = gp
	mysg.isSelect = false
	mysg.c = c
	gp.waiting = mysg
	gp.param = nil
    // 将 sudog 放入等待队列
	c.sendq.enqueue(mysg)
	
    
	gp.parkingOnChan.Store(true)
	gopark(chanparkcommit, unsafe.Pointer(&c.lock), waitReasonChanSend, traceEvGoBlockSend, 2)
	
    
	KeepAlive(ep)

	if mysg != gp.waiting {
		throw("G waiting list is corrupted")
	}
	gp.waiting = nil
	gp.activeStackChans = false
	closed := !mysg.success
	gp.param = nil
	if mysg.releasetime > 0 {
		blockevent(mysg.releasetime-t0, 2)
	}
	mysg.c = nil
	releaseSudog(mysg)
	if closed {
		if c.closed == 0 {
			throw("chansend: spurious wakeup")
		}
		panic(plainError("send on closed channel"))
	}
	return true
}
```

从上述代码中可以看出，发送数据分为有缓冲区和无缓冲区的情况。

- 有缓冲区时，如果缓冲区还有空间，则将发送的数据和各种信息放进缓冲区中。否则，与无缓冲区一样处理
- 无缓冲区或者缓冲区已满，那么就会将 goroutine 放入等待队列中，阻塞等待。

### 接收数据

```go
func chanrecv(c *hchan, ep unsafe.Pointer, block bool) (selected, received bool) {
    // 和 发送 一样
	if c == nil {
		if !block {
			return
		}
		gopark(nil, nil, waitReasonChanReceiveNilChan, traceEvGoStop, 2)
		throw("unreachable")
	}

/*-----------第一部分---------*/
    // channel 为空 或者 channel 已关闭，直接返回
	if !block && empty(c) {
		if atomic.Load(&c.closed) == 0 {
			// channel 已经被关闭了
			return
		}
		
		if empty(c) {
			// channel 为空
			if ep != nil {
				typedmemclr(c.elemtype, ep)
			}
			return true, false
		}
	}

	var t0 int64
	if blockprofilerate > 0 {
		t0 = cputicks()
	}

	lock(&c.lock)

/*-----------第二部分------------*/
    // channel 被关闭，且缓冲区无元素，直接返回
	if c.closed != 0 {
		if c.qcount == 0 {
			unlock(&c.lock)
			if ep != nil {
				typedmemclr(c.elemtype, ep)
			}
			return true, false
		}
		// 如果 channel 被关闭了，但是缓冲区还有元素，那么就先拿
	} else {
        /*----------第三部分-----------*/
		// 如果没关闭，有进程在等待发送数据，则直接从队列中获取
		if sg := c.sendq.dequeue(); sg != nil {
			recv(c, sg, ep, func() { unlock(&c.lock) }, 3)
			return true, true
		}
	}

/*----------第四部分-----------*/
    // 缓冲区中有元素，直接拿
	if c.qcount > 0 {
		qp := chanbuf(c, c.recvx)
		if ep != nil {
			typedmemmove(c.elemtype, ep, qp)
		}
		typedmemclr(c.elemtype, qp)
		c.recvx++
		if c.recvx == c.dataqsiz {
			c.recvx = 0
		}
		c.qcount--
		unlock(&c.lock)
		return true, true
	}

	if !block {
		unlock(&c.lock)
		return false, false
	}

/*----------第五部分-----------*/
    // 将当前 goroutine 挂起，阻塞等待读取数据
	gp := getg()
	mysg := acquireSudog()
	mysg.releasetime = 0
	if t0 != 0 {
		mysg.releasetime = -1
	}
    
	mysg.elem = ep
	mysg.waitlink = nil
	gp.waiting = mysg
	mysg.g = gp
	mysg.isSelect = false
	mysg.c = c
	gp.param = nil
	c.recvq.enqueue(mysg)
	// Signal to anyone trying to shrink our stack that we're about
	// to park on a channel. The window between when this G's status
	// changes and when we set gp.activeStackChans is not safe for
	// stack shrinking.
	gp.parkingOnChan.Store(true)
	gopark(chanparkcommit, unsafe.Pointer(&c.lock), waitReasonChanReceive, traceEvGoBlockRecv, 2)

	// someone woke us up
	if mysg != gp.waiting {
		throw("G waiting list is corrupted")
	}
	gp.waiting = nil
	gp.activeStackChans = false
	if mysg.releasetime > 0 {
		blockevent(mysg.releasetime-t0, 2)
	}
	success := mysg.success
	gp.param = nil
	mysg.c = nil
	releaseSudog(mysg)
	return true, success
}
```

从添加的注释可以看到，处理接收数据的函数大概情况是：

1. channel 为空，挂起并返回
2. channel 关闭，且无数据在缓冲区中，返回
3. 有缓冲区，缓冲区中有数据，直接拿数据
4. 无缓冲区，或者缓冲区中无数据，但有等待发送数据的 goroutine，拿到数据并返回
5. 无缓冲区，缓冲区中无数据，无等待发送数据的 goroutine，挂起接收的这个 goroutine，阻塞等待数据接收。

### 关闭

```go
func closechan(c *hchan) {
/*-------------第一部分-----------------*/
    // 检查是否关闭了空的 channel
	if c == nil {
		panic(plainError("close of nil channel"))
	}
	// 检查是否关闭了已关闭的 channel
	lock(&c.lock)
	if c.closed != 0 {
		unlock(&c.lock)
		panic(plainError("close of closed channel"))
	}

    // 设置状态位
	c.closed = 1

	var glist gList

/*-----------第二部分-----------*/
    // 将读写的 goroutine 加入到 glist 中，最后处理
	// 释放所有正在读或等待读的 goroutine
	for {
		sg := c.recvq.dequeue()
		if sg == nil {
			break
		}
		if sg.elem != nil {
			typedmemclr(c.elemtype, sg.elem)
			sg.elem = nil
		}
		if sg.releasetime != 0 {
			sg.releasetime = cputicks()
		}
		gp := sg.g
		gp.param = unsafe.Pointer(sg)
		sg.success = false
		if raceenabled {
			raceacquireg(gp, c.raceaddr())
		}
		glist.push(gp)
	}

	// 释放所有还在尝试发送的 goroutine（会 panic
	for {
		sg := c.sendq.dequeue()
		if sg == nil {
			break
		}
		sg.elem = nil
		if sg.releasetime != 0 {
			sg.releasetime = cputicks()
		}
		gp := sg.g
		gp.param = unsafe.Pointer(sg)
		sg.success = false
		if raceenabled {
			raceacquireg(gp, c.raceaddr())
		}
		glist.push(gp)
	}
	unlock(&c.lock)

/*-----------第三部分-----------*/    
	// 所有前面加入到 glist 的 goroutine 全部运行起来
	for !glist.empty() {
		gp := glist.pop()
		gp.schedlink = 0
		goready(gp, 3)
	}
}
```



## Reference

[图解Golang channel源码 - 掘金 (juejin.cn)](https://juejin.cn/post/6875325172249788429#heading-14)

[golang channel 源码剖析 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/62391727)

