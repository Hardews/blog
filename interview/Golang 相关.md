---
slug: golang
sidebar_position: 1
---



## go mutex

mutex 是 go 实现的互斥锁，在各种并发场景下使用的比较多。

golang 的 mutex 结合了传统锁实现模式，提出了一种公平性的优化方式是饥饿模式。当有 goroutine 1ms 以上没有获取到锁时，会启动饥饿模式，使用 Handoff 的方式有序的将锁给队列中在排队的 goroutine。

并且，golang 的作者认为有些情况下，自旋获取锁可以提高很大性能。但是非必要的时候不会自旋，只有在满足自旋条件时才可以进入自旋。而这个条件非常苛刻，需要：

- 自旋次数 < 4
- 必须是多核CPU 且 GOMAXPROCS>1
- 至少有一个其他的正在运行的 P 并且本地运行队列为空



## golang sema

sema 是 golang 中的信号量。一般会在各种数据结构以及某些特性的实现中出现，它的主要功能是控制 goroutine 的睡眠和唤醒等。比如 mutex、waitgroup 等就使用了 mutex。在 golang 中，它是一个 uint32 的类型，底层是 semaRoot 结构体。

信号量在并发编程中，是一种常见的同步机制，可以解决互斥访问、缓冲区管理等问题。

其源码在 runtime 包中。
