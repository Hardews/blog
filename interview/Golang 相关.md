---
slug: golang
sidebar_position: 1
---

# Golang 相关

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



## go 语言中，切片和数组的区别

切片和数组的底层都是数组。

它俩的主要区别是，切片是一个可变长数组。通常数组定义了就不能再变化长度，而切片可以追加元素。

总的来说，切片就是数组的可变长版本。



## golang 的 map 是并发安全的吗？

golang 中的 map 不是并发安全的，如果我们对一个 map 进行并发读写，那么就会导致程序 panic。

但是我们可以通过加锁，或者使用 sync 包下的 sync.Map 保证并发安全。



## sync.Map 是如何保证并发安全的？



## go 并发编程如何避免死锁

- 避免嵌套锁，在使用多个锁时，保证嵌套顺序相同，避免循环等待的情况出现，导致死锁。
- 避免无限等待，设置获取锁的超时时间，确保超时后能进行其他兜底操作。
- 避免过度竞争，如果多个协程需要访问相同的资源，保证不会相互干扰。



## hash 冲突如何解决？

- 开放寻址法，简单来说就是当前位置被人占用了，那么就去找下一个位置。
- 再 hash 法，同时构建多个哈希函数，当发生冲突时使用另外一个
- 链地址法，将哈希地址相同的记录都记录在一个链表中
- 建立公共溢出区，将哈希表分为基本表和溢出表，将发生冲突的都放在溢出表中

golang 中的 map 实现，使用的是链地址与公共溢出区相结合。



## 一致性哈希

**引入**

对于分布式存储，不同机器上存储不同的数据。可以通过哈希函数建立从数据到服务器之间的映射关系。

举个例子就是，现有 3 台机器，10 个数据的哈希值从 1 到 10。通过 mod 将这些数据分到 3 台机器中。也就是 `hash(val) mod 3`。

此时，如果新增了一台机器（也就是 `hash(val) mod 4`），我们需要移动一些数据。当数据量很大时，采用一般的哈希函数，可能会造成大量的数据迁移。



而一致性哈希算法正是为了解决这类问题。它可以保证当机器增加或者减少时，数据迁移只限于两个节点之间。

