---
slug: golang-context
title: Golang context 使用及解析
authors: [hardews]
tag: [2023, Golang, 并发控制, context]
---



# Golang context 使用及源码解析

context 是 go 语言中并发控制的一大利器，在复杂的 goroutine 场景中，context 可以起到很大的作用。

## 应用场景

常见的应用例子如下：

```go
func main() {
	var ctx, cancel = context.WithCancel(context.Background())
	go func() {
		bar(ctx, "韭菜")
		fmt.Println("韭菜 end")
	}()
	go func() {
		bar(ctx, "鸡腿")
		fmt.Println("鸡腿 end")
	}()
	
    time.Sleep(3 * time.Second)
	cancel()
    time.Sleep(time.Second) // 这是为了 cancel 后面的打印语句能执行，用 waitgroup 也可以
	fmt.Println("all end")
}

func bar(ctx context.Context, food string) {
	for i := 1; ; i++ {
		select {
		case <-ctx.Done():
			return
		default:
			fmt.Printf("bar %s now\n", food)
			time.Sleep(time.Second)
		}
	}
}
```

输出：

```go
bar 韭菜 now
bar 鸡腿 now
bar 鸡腿 now
bar 韭菜 now
bar 韭菜 now
bar 鸡腿 now
鸡腿 end
韭菜 end
all end
```

## 源码解析

### 数据结构

**Context 接口**

```go
type Context interface {
	Deadline() (deadline time.Time, ok bool)
    
	Done() <-chan struct{}
    
	Err() error
    
	Value(key any) any
}
```

Context 是一个接口，包含四种方法：

- Deadline，返回一个时间和布尔值，表示这个 ctx 的超时时间以及是否超时
- Done，是一个 channel 类型，ctx 调用 cancel 函数，会向这个管道发送数据
- Err，一些可能的错误
- Value，context 以键值对的方式存储一些数据

### 接口实现

实现了上述接口的结构体有四个。

#### emptyCtx

```go
type emptyCtx int

func (*emptyCtx) Deadline() (deadline time.Time, ok bool) {
	return
}

func (*emptyCtx) Done() <-chan struct{} {
	return nil
}

func (*emptyCtx) Err() error {
	return nil
}

func (*emptyCtx) Value(key any) any {
	return nil
}

func (e *emptyCtx) String() string {
	switch e {
	case background:
		return "context.Background"
	case todo:
		return "context.TODO"
	}
	return "unknown empty Context"
}
```

emptyCtx 的实现很简单，它主要是用于 context 的初始化，当我们在调用 Background 或 TODO 时，其实就是初始化一个 emptyCtx。

```go
var (
	background = new(emptyCtx)
	todo       = new(emptyCtx)
)

func Background() Context {
	return background
}

func TODO() Context {
	return todo
}
```

#### cancelCtx

在应用中，我们会调用 `ctx.WithContext` 这个函数，该函数会返回一个 context 和一个 cancelFunc。

```go
func WithCancel(parent Context) (ctx Context, cancel CancelFunc) {
	c := withCancel(parent)
	return c, func() { c.cancel(true, Canceled, nil) }
}
```

一句一句看。

可以看到先是调用了 `withCancel` 函数。

```go
func withCancel(parent Context) *cancelCtx {
	if parent == nil {
		panic("cannot create context from nil parent")
	}
	c := newCancelCtx(parent)
	propagateCancel(parent, c)
	return c
}
```

其中，最需要关心的是两

`newCancelCtx`

```go
func newCancelCtx(parent Context) *cancelCtx {
	return &cancelCtx{Context: parent}
}
```

该函数返回一个 cancelCtx 类型，并将父 context 挂上，形成一个 context 链

```go
type cancelCtx struct {
	Context

	mu       sync.Mutex // 锁
	done     atomic.Value // 实际上为 chan struct 类型
    
    // 存储所有子 context，只需要实现 Done 和 cancel 方法，因此重新定义了一个接口
	children map[canceler]struct{}
    
	err      error
	cause    error
}

type canceler interface {
	cancel(removeFromParent bool, err, cause error)
	Done() <-chan struct{}
}
```

`propagateCancel`

```go
// 这个函数用来保证父 context cancel，子 context 也 cancel
func propagateCancel(parent Context, child canceler) {
	done := parent.Done()
	if done == nil {
        // 为空则证明 parent 其实是个 emptyCtx，直接返回即可
		return
	}

	select {
	case <-done:
		// 父 context 已经 cancel 了，那么新建的也要 cancel
		child.cancel(false, parent.Err(), Cause(parent))
		return
	default:
	}

    // 将 parent 转为 cancelCtx 类型，具体看下面
	if p, ok := parentCancelCtx(parent); ok {
        // 成功转为 cancelCtx，将其加到 children 这个 map 里
		p.mu.Lock()
		if p.err != nil {
			child.cancel(false, p.err, p.cause)
		} else {
			if p.children == nil {
				p.children = make(map[canceler]struct{})
			}
			p.children[child] = struct{}{}
		}
		p.mu.Unlock()
	} else {
        // 不能转成 cancelCtx，则起一个协程，阻塞等待直到 Done
		goroutines.Add(1)
		go func() {
			select {
			case <-parent.Done():
				child.cancel(false, parent.Err(), Cause(parent))
			case <-child.Done():
			}
		}()
	}
}

func parentCancelCtx(parent Context) (*cancelCtx, bool) {
    // 获取 done 管道
	done := parent.Done()
    // 已关闭，或者为空，直接返回 false
	if done == closedchan || done == nil {
		return nil, false
	}
    // 通过 cancelCtxKey 转为 cancel 类型
	p, ok := parent.Value(&cancelCtxKey).(*cancelCtx)
    // 不能转，就返回 false
	if !ok {
		return nil, false
	}
    // 判断 done 状态是否相同，不同返回 false
	pdone, _ := p.done.Load().(chan struct{})
	if pdone != done {
		return nil, false
	}
	return p, true
}
```

初始化过程完了，那么看 WithCancel 的返回参数。一个是初始化好的 ctx，一个则是 cancel 方法。

```go
return c, func() { c.cancel(true, Canceled, nil) }
```

我们可以看到定义了一个函数

```go
func(){
    c.cancel(true, Canceled, nil)
}
```

其中，`Canceled` 参数的定义是：

```go
var Canceled = errors.New("context canceled")
```

然后

```go
func (c *cancelCtx) cancel(removeFromParent bool, err, cause error) {
    // 传入的参数 err 是不能为 nil 的
	if err == nil {
		panic("context: internal error: missing cancel error")
	}
    // 传入的参数 cause 必须为 nil
	if cause == nil {
		cause = err
	}
	c.mu.Lock()
	if c.err != nil {
        // ctx 的 err 不为 nil，此时已经 cancel 了
		c.mu.Unlock()
		return
	}
    // 将 ctx 赋值为传入的参数
	c.err = err
	c.cause = cause
    // 获取 done 管道
	d, _ := c.done.Load().(chan struct{})
	if d == nil {
		c.done.Store(closedchan)
	} else {
		close(d)
	}
    // 孩子也需要 cancel
	for child := range c.children {
		// NOTE: acquiring the child's lock while holding parent's lock.
		child.cancel(false, err, cause)
	}
	c.children = nil
	c.mu.Unlock()

    // 如果自己也是孩子，到父节点删掉自己
	if removeFromParent {
		removeChild(c.Context, c)
	}
}
```

以上就是 cancelCtx 的实现

#### valueCtx

valueCtx 的实现很简单。

一个简单的使用 value 的示例是：

```go
var ctx = context.WithValue(context.Background(), "hardews", "https://hardews.cn/blog")
fmt.Println(ctx.Value("hardews"))
```

查看源码可以看到 valueCtx 的定义：

```go
type valueCtx struct {
	Context
	key, val any
}
```

对于它的初始化：

```go
func WithValue(parent Context, key, val any) Context {
    // parent 不能为空
	if parent == nil {
		panic("cannot create context from nil parent")
	}
    // key 也不能为空
	if key == nil {
		panic("nil key")
	}
    // 这是判断它是否有可比较性
	if !reflectlite.TypeOf(key).Comparable() {
		panic("key is not comparable")
	}
    // 返回一个 valueCtx
	return &valueCtx{parent, key, val}
}
```

对于它的一些方法：

```go
// 转为 string，直接拼接
func (c *valueCtx) String() string {
	return contextName(c.Context) + ".WithValue(type " +
		reflectlite.TypeOf(c.key).String() +
		", val " + stringify(c.val) + ")"
}

func (c *valueCtx) Value(key any) any {
    // 如果就是 valueCtx 类型，直接返回即可
	if c.key == key {
		return c.val
	}
    // 父亲中找
	return value(c.Context, key)
}

func value(c Context, key any) any {
    // 这就是一层一层往上找，直到找到，或者为空
	for {
		switch ctx := c.(type) {
		case *valueCtx:
			if key == ctx.key {
				return ctx.val
			}
			c = ctx.Context
		case *cancelCtx:
			if key == &cancelCtxKey {
				return c
			}
			c = ctx.Context
		case *timerCtx:
			if key == &cancelCtxKey {
				return ctx.cancelCtx
			}
			c = ctx.Context
		case *emptyCtx:
			return nil
		default:
			return c.Value(key)
		}
	}
}
```

#### timerCtx

直接切入正题

```go
type timerCtx struct {
	*cancelCtx
	timer *time.Timer // 一个计时器

	deadline time.Time // 过期时间
}
```

当我们调用 WithTimeout 时，本质上都是调用 WithDeadline

```go
func WithTimeout(parent Context, timeout time.Duration) (Context, CancelFunc) {
	return WithDeadline(parent, time.Now().Add(timeout))
}
```

```go
func WithDeadline(parent Context, d time.Time) (Context, CancelFunc) {
    // parent 不能为空
	if parent == nil {
		panic("cannot create context from nil parent")
	}
    // 是否可以获取到过期时间
	if cur, ok := parent.Deadline(); ok && cur.Before(d) {
		// 可以获取到，且过期时间已经到了
        // cancel
		return WithCancel(parent)
	}
    // 初始化一个 timer
	c := &timerCtx{
		cancelCtx: newCancelCtx(parent),
		deadline:  d,
	}
    // 上面说过，这是用来保证父 ctx cancel 时，子 ctx 也 cancel
	propagateCancel(parent, c)
    // 校验 deadline 是否已经过了
	dur := time.Until(d)
	if dur <= 0 {
		c.cancel(true, DeadlineExceeded, nil) // deadline has already passed
		return c, func() { c.cancel(false, Canceled, nil) }
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.err == nil {
        // 在时间到了之后 执行 cancel 函数
		c.timer = time.AfterFunc(dur, func() {
			c.cancel(true, DeadlineExceeded, nil)
		})
	}
	return c, func() { c.cancel(true, Canceled, nil) }
}
```

可以看到 timerCtx 的实现其实就是加个定时器，定时执行一个 cancel 函数。

## Reference

[go语言标准库context.go源码解读 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/293666788)

[go context 的源码解读 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/666367870)