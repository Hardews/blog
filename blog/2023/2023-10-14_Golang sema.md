---
slug: golang-sema
title: Golang sema
authors: [hardews]
tags: [2023, Golang, 并发控制, sema]
---



# Golang sema

在 waitgroup 和 mutex 的源码中，都使用了一个 sema 信号量。

```go
type Mutex struct {
   state int32
   sema  uint32 // 使用了 sema 信号量
}
```

```go
type WaitGroup struct {
	noCopy noCopy

	state atomic.Uint64 
	sema  uint32 // 也使用了 sema 信号量
}
```

今天就来看看这个 sema。

<!--truncate-->

## 什么是信号量？

> 信号量的概念是由[荷兰](https://zh.wikipedia.org/wiki/荷兰)计算机科学家[艾兹赫尔·戴克斯特拉](https://zh.wikipedia.org/wiki/艾兹赫尔·戴克斯特拉)（Edsger W. Dijkstra）发明的[[1\]](https://zh.wikipedia.org/wiki/信号量#cite_note-1)，广泛的应用于不同的[操作系统](https://zh.wikipedia.org/wiki/操作系统)中。在系统中，给予每一个[进程](https://zh.wikipedia.org/wiki/行程)一个信号量，代表每个进程目前的状态，未得到控制权的进程会在特定地方被强迫停下来，等待可以继续进行的信号到来。**如果信号量是一个任意的整数，通常被称为计数信号量（Counting semaphore）**，或一般信号量（general semaphore）；如果信号量只有二进制的0或1，称为二进制信号量（binary semaphore）。

当信号量为负数时，进程停止执行。其他情况则继续执行。

这里还需要提一下 PV 操作：

- P 操作，申请资源，信号量 --
- V 操作，释放资源，信号量 ++

而 sema 代表的是资源的状态，当 ：

- sema > 0，资源充足，不需要排队
- sema = 0，资源紧张，需要竞争
- sema < 0，资源不足，需要等待

Golang sema 中有类似 PV 操作，它的核心是一个 uint32 类型的值，可以看作资源的数量。



## 一些源码解析

### 结构体

在 `runtime/sema.go` 中，可以找到 sema 的源码，以下是 sema 的底层结构体

```go
type semaRoot struct {
	lock  mutex
	treap *sudog        // 平衡树的根节点
	nwait atomic.Uint32 // 有多少在等待的 goroutine
}
```

我们可以看到结构体有三个字段，其中需要介绍一下：

- `lock`，这是 runtime 包中的 lock，用来防止并发问题。
- `treap`，平衡树的根节点。从之前的文章中有介绍过，当我们有 goroutine 获取锁时，如果没有获取到，那么我们的 goroutine 会进入一个等待的状态。而 goroutine 呢就会被包装成一个 sudog 结构体放入到 treap 这个平衡树中进行等待。
- `nwait`，等待 goroutine 的数量，理论上说它的值与平衡树的节点值相等。



而 sudog 结构体部分定义如下：

```go
type sudog struct {
	g *g // 使用该结构体的协程

	next *sudog 
	prev *sudog
	elem unsafe.Pointer // 协程等待的信号量地址
    ……
	waitlink *sudog // 每个信号量对应的 sudog 队列
    ……
}
```

其中：

- `elem`，是 sema 的地址
- `waitlink`，sudog 是一个平衡树的节点，而平衡树的节点实际上是一个队列。



### sema 的控制

对于 sema 的控制，我们可以看代码（去掉了一些）↓

```go
// 被 runtime 调用
func semacquire(addr *uint32) {
	semacquire1(addr, false, 0, 0, waitReasonSemacquire)
}

func semacquire1(addr *uint32, lifo bool, profile semaProfileFlags, skipframes int, reason waitReason) {
	// Easy case.
    // 直接拿到资源，然后返回
	if cansemacquire(addr) {
		return
	}

	// Harder case:
	// 需要排队，那么就加入队列等待
	s := acquireSudog()
	root := semtable.rootFor(addr)
	t0 := int64(0)
	s.releasetime = 0
	s.acquiretime = 0
	s.ticket = 0
	if profile&semaBlockProfile != 0 && blockprofilerate > 0 {
		t0 = cputicks()
		s.releasetime = -1
	}
	if profile&semaMutexProfile != 0 && mutexprofilerate > 0 {
		if t0 == 0 {
			t0 = cputicks()
		}
		s.acquiretime = t0
	}
    // 一直循环直到拿到资源
	for {
		lockWithRank(&root.lock, lockRankRoot)
		root.nwait.Add(1)
		if cansemacquire(addr) {
			root.nwait.Add(-1)
			unlock(&root.lock)
			break
		}
		root.queue(addr, s, lifo)
        // 这里执行 gopark，让 g 休眠
		goparkunlock(&root.lock, reason, traceEvGoBlockSync, 4+skipframes)
		if s.ticket != 0 || cansemacquire(addr) {
            // 拿到资源了，退出循环
			break
		}
	}
	if s.releasetime > 0 {
		blockevent(s.releasetime-t0, 3+skipframes)
	}
	releaseSudog(s)
}
```

可以看到这段代码可分为两部分：

- 资源充足，直接拿到资源并返回。
- 资源不充足，加入队列并循环等待，等待使要么是循环等待，要么是睡眠等待。

当等待结束后，会释放 sudog。也就是最后一行的 releaseSudog。



## Reference

[go中mutex的sema信号量是什么？ - 掘金 (juejin.cn)](https://juejin.cn/post/7276366126204420157)

[Go 底层锁：原子操作和sema信号量 - 掘金 (juejin.cn)](https://juejin.cn/post/7225768154881048613#heading-4)