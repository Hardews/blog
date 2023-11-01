---
slug: golang-sync-map
title: Golang sync.Map 探讨
authors: [hardews]
tag: [2023, Golang, map]
---

# Golang sync.Map

go 原生的 map 是不支持并发的。在并发读写时，会 panic。

为什么不支持呢？go 官方答复的原因如下：

- 典型使用场景不需要。在 map 的典型使用场景中，不需要从多个 goroutine 并发访问及读写。
- 性能考虑。如果只是为少数程序增加安全性，导致 map 所有的操作都要处理 mutex 或者用到原子操作，这会降低大多数程序的性能。

也就是牺牲了一部分程序的安全性，提升大多数程序的性能。

那么如果需要考虑并发，我们可以对 map 使用锁。

亦或者引入今天的话题，sync.Map。

<!--truncate-->

## sync.Map 结构体

```go
type Map struct {
   mu Mutex //互斥锁
   read atomic.Value // readOnly //读结构
   dirty map[interface{}]*entry  //写结构
   misses int //没有命中的次数
}
```

## readOnly 结构

```go
type readOnly struct{
    m map[interface{}]*entry // 与 dirty 相同的结构，但指向不一样的数组
    amended bool // dirty 是否有 m 没有的数据（也就是添加元素或改变元素了
}
```

## entry 结构

```go
type entry struct{
    p unsafe.Pointer // 指向 val 的地址
}
```

## Load（值的获取

```go
func (m *Map) Load(key any) (value any, ok bool) {
    // 原子获取 readOnly
	read := m.loadReadOnly()
    // 尝试从 m 中获取
	e, ok := read.m[key]
    // 如果没有找到该元素，并且 dirty 中有 m 没有的元素
    // 去 dirty 找
	if !ok && read.amended {
        // 上锁
		m.mu.Lock()
		
        // 再拿一遍
        // 这是一个提升性能的操作
        // 我们拿到锁了 可能情况是 -> 有个同时读的释放了锁，那么我们只需要再拿一遍就能拿到
		read = m.loadReadOnly()
		e, ok = read.m[key]
		if !ok && read.amended {
			e, ok = m.dirty[key]
			// 还是没拿到，我们就去 dirty 拿
            // missLocked 下面看
			m.missLocked()
		}
        // 释放锁
		m.mu.Unlock()
	}
	if !ok {
		return nil, false
	}
	return e.load()
}
```

大概流程就是：从 readOnly 的 m 中拿元素 -> [没拿到，dirty 可能有就去 dirty 拿] -> 返回结果

其中，有一个 missLocked

```go
func (m *Map) missLocked() {
    // m 的命中数 +1
	m.misses++
	if m.misses < len(m.dirty) {
		return
	}
    // 如果命中数为 n 时
    // 将 dirty 的数据向 m 移动
	m.read.Store(&readOnly{m: m.dirty})
	m.dirty = nil
	m.misses = 0
}
```



## Store（存储

```go
// 实际上调用 Swap
func (m *Map) Store(key, value any) {
	_, _ = m.Swap(key, value)
}

func (m *Map) Swap(key, value any) (previous any, loaded bool) {
	read := m.loadReadOnly()
    // 是否已经有记录了
	if e, ok := read.m[key]; ok {
        // 尝试存储，存储成功了就直接返回
		if v, ok := e.trySwap(&value); ok {
			if v == nil {
				return nil, false
			}
			return *v, true
		}
	}

    // 没存成功 或者 没有这个数据
	m.mu.Lock()
    // 加锁再读（防止这段时间有人修改
	read = m.loadReadOnly()
	if e, ok := read.m[key]; ok {
		if e.unexpungeLocked() {
			// 如果 unexpungeLocked 为 true，直接值覆盖
            // m.dirty 不会为 nil
            // 这是因为为 true 的条件是调用了 dirtyLocked ，此时 dirty 一定不为 nil
			m.dirty[key] = e
		}
        // 加锁且赋值
		if v := e.swapLocked(&value); v != nil {
			loaded = true
			previous = *v
		}
	} else if e, ok := m.dirty[key]; ok {
        // 如果在 dirty 找到了，那么直接覆盖值
		if v := e.swapLocked(&value); v != nil {
			loaded = true
			previous = *v
		}
	} else {
        // 这里是 dirty 为 nil 的情况
		if !read.amended {
			// 下面会说 dirtyLocked 的源码
            // 简单来说就是将 m 的键值复制一份
			m.dirtyLocked()
            // 修改属性
			m.read.Store(&readOnly{m: read.m, amended: true})
		}
        // 然后往 dirty 写入
		m.dirty[key] = newEntry(value)
	}
    // 释放锁
	m.mu.Unlock()
	return previous, loaded
}
```

上面的一些函数

### tryExpungeLocked

```go
func (e *entry) tryExpungeLocked() (isExpunged bool) {
	p := e.p.Load()
    // 循环判断当前值是否是被删除的
	for p == nil {
		if e.p.CompareAndSwap(nil, expunged) {
            // 是被删除的，置为 nil，返回 true
			return true
		}
		p = e.p.Load()
	}
	return p == expunged
}
```

### dirtyLocked

```go
func (m *Map) dirtyLocked() {
	if m.dirty != nil {
		return
	}

    // 如果为空
	read := m.loadReadOnly()
	m.dirty = make(map[any]*entry, len(read.m))
    // 复制一份
	for k, e := range read.m {
		if !e.tryExpungeLocked() {
            // 未删除的数据复制一份
			m.dirty[k] = e
		}
	}
}
```

### unexpungeLocked

```go
func (e *entry) unexpungeLocked() (wasExpunged bool) {
    // 是否被删除
	return e.p.CompareAndSwap(expunged, nil)
}
```

## Delete

```go
func (m *Map) Delete(key any) {
	m.LoadAndDelete(key)
}

func (m *Map) LoadAndDelete(key any) (value any, loaded bool) {
	read := m.loadReadOnly()
	e, ok := read.m[key]
	if !ok && read.amended {
        // 老样子，dirty 找找看
		m.mu.Lock()
        // 上锁后再读
		read = m.loadReadOnly()
		e, ok = read.m[key]
        // 再检查一遍
		if !ok && read.amended {
            // 直接删除掉
			e, ok = m.dirty[key]
			delete(m.dirty, key)
            // 次数加1
			m.missLocked()
		}
        // 释放锁
		m.mu.Unlock()
	}
	if ok {
        // 直接调用删除即可
		return e.delete()
	}
	return nil, false
}
```

### entry.delete

```go
func (e *entry) delete() (value any, ok bool) {
	for {
        // 读取
		p := e.p.Load()
        // 已经被删除了
		if p == nil || p == expunged {
			return nil, false
		}
        // 尝试删除
		if e.p.CompareAndSwap(p, nil) {
			return *p, true
		}
	}
}
```

## Range

```go
func (m *Map) Range(f func(key, value any) bool) {
	read := m.loadReadOnly()
	if read.amended {
		// m 和 dirty 的不一致
		m.mu.Lock()
		read = m.loadReadOnly()
		if read.amended {
            // 将 dirty 的数据给 m
			read = readOnly{m: m.dirty}
			m.read.Store(&read)
			m.dirty = nil
			m.misses = 0
		}
		m.mu.Unlock()
	}

    // 读
	for k, e := range read.m {
		v, ok := e.load()
		if !ok {
			continue
		}
		if !f(k, v) {
			break
		}
	}
}
```

## Refrence

[深入解析 go sync.map 源码 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/412225317)