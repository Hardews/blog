---
slug: leetcode-daily
title: LeetCode 每日一题
authors: [hardews]
tags: [2023, LeetCode, 每日一题]
---



# LeetCode 每日一题

**十月**

| 一         | 二         | 三         | 四         | 五         | 六         | 七         |
| ---------- | ---------- | ---------- | ---------- | ---------- | ---------- | ---------- |
|            |            |            |            |            |            | **[10.1]** |
| **[10.2]** | **[10.3]** | **[10.4]** | **[10.5]** | **[10.6]** | **[10.7]** | **[10.8]** |
| 9          | 10         | 11         | 12         | 13         | 14         | 15         |
| 16         | 17         | 18         | 19         | 20         | 21         | 22         |
| 23         | 24         | 25         | 26         | 27         | 28         | 29         |

<!--truncate-->

## 10.1｜[121. 买卖股票的最佳时机](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock/description/)

**思路**

本来想用双指针，但是 [2,1,4] 以及 [2,4,1] 这两个让我放弃了这个想法。

**方法一**：暴力，直接遍历两遍（不贴代码了）

**方法二**：维护一个单调队列，记录每个元素下一个最大的数。

**代码实现**

```go
func maxProfit(prices []int) int {
     // 维护一个单调栈
     var ans int
     var s []int
     
     for i := len(prices) - 1; i >= 0; i--{
         for len(s) > 0 && s[0] < prices[i]{
             s = s[1:]
         }

         if len(s) > 0{
             // 当前元素有下一个最大的元素，更新答案
             ans = max(s[0] - prices[i], ans)
         }
         s = append(s, prices[i])
     }
     
     return ans
}

func max(x, y int) int {
    if x < y{
        return y
    }
    return x
}
```



## 10.2｜[122. 买卖股票的最佳时机 II](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-ii/?envType=daily-question&envId=2023-10-02)

**思路 & 代码实现**

贪心 + 单调栈。当我们找到当前元素的下一个更大元素时，贪心的将利润拿下。相当于我们可以只要能得到利润时就卖出，最后就能拿到最大收益。

```go
func maxProfit(prices []int) int {
    var s []int
    var ans int

    for i := len(prices) - 1; i >= 0; i--{
        for len(s) > 0 && s[len(s) - 1] < prices[i]{
            s = s[:len(s) - 1]
        }

        if len(s) > 0{
            ans += s[len(s) - 1] - prices[i]
            s = s[:len(s) - 1]
        }

        s = append(s, prices[i])
    }
    return ans
}
```

**动态规划**

```go
func maxProfit(prices []int) int {
    var n = len(prices)
    
    var f = make([][2]int, n+1)
    // 0 为未持有， 1 为持有
    f[0][1] = math.MinInt

    for i, p := range prices{
        f[i+1][0] = max(f[i][0], f[i][1] + p)
        f[i+1][1] = max(f[i][1], f[i][0] - p)
    }

    return f[n][0]
}


func max(x, y int) int {
    if x < y {
        return y
    }
    return x
}
```



## 10.3｜[123. 买卖股票的最佳时机 III](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-iii/description/?envType=daily-question&envId=2023-10-03)

**思路**

（超时）记忆化搜索 -> 在 dfs 函数中引入 k，当 k 小于 0 时即已经进行了两次交易，返回。

**代码实现**

```go
func maxProfit(prices []int) int {
    n := len(prices)
    var dfs func(int, int, int) int
    var memory = make([][3][2]int, n)
    for i := range memory{
        memory[i] = [3][2]int{[2]int{-1, -1}, [2]int{-1, -1}, [2]int{-1, -1}}
    }

    // k 表示当前交易了几次
    dfs = func(i, k, hold int) (res int){
        if k < 0{
            return math.MinInt / 2
        }

        if i < 0{
            if hold == 1{
                return math.MinInt / 2
            }
            return 0
        }

        p := &memory[i][k][hold]
        if *p != -1 {
            return *p
        }
        defer func() { *p = res }()

        if hold == 1{
            return max(dfs(i - 1, k, 1), dfs(i - 1, k - 1, 0) - prices[i])
        }
        return max(dfs(i - 1, k, 0), dfs(i - 1, k, 1) + prices[i])
    }

    return dfs(n - 1, 2, 0)
}

func max(a, b int) int { if a < b { return b }; return a }
```



## 10.4｜[188. 买卖股票的最佳时机 IV](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-iv/?envType=daily-question&envId=2023-10-04)

**思路**

照搬上一题的代码，将常量改为 k 就行。

**代码实现**

```go
func maxProfit(k int, prices []int) int {
    n := len(prices)
    var dfs func(int, int, int) int
    var memory = make([][][2]int, n)
    for i := range memory{
        memory[i] = make([][2]int, k + 1)
        for j := range memory[i]{
            memory[i][j] = [2]int{-1, -1}
        }
    }

    // k 表示当前交易了几次
    dfs = func(i, k, hold int) (res int){
        if k < 0{
            return math.MinInt / 2
        }

        if i < 0{
            if hold == 1{
                return math.MinInt / 2
            }
            return 0
        }

        p := &memory[i][k][hold]
        if *p != -1 {
            return *p
        }
        defer func() { *p = res }()

        if hold == 1{
            return max(dfs(i - 1, k, 1), dfs(i - 1, k - 1, 0) - prices[i])
        }
        return max(dfs(i - 1, k, 0), dfs(i - 1, k, 1) + prices[i])
    }

    return dfs(n - 1, k, 0)
}

func max(a, b int) int { if a < b { return b }; return a }
```





## 10.5｜[309. 买卖股票的最佳时机含冷冻期](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-with-cooldown/?envType=daily-question&envId=2023-10-05)

**思路**

冷冻期，顾名思义就是卖出后要隔一个遍历。所以，当一笔交易完成时，i - 1 变为 i - 2 即可。

**代码实现**

```go
func maxProfit(prices []int) int {
    n := len(prices)
    memo := make([][2]int, n)
    for i := range memo {
        memo[i] = [2]int{-1, -1} // -1 表示还没有计算过
    }
    var dfs func(int, int) int
    dfs = func(i, hold int) (res int) {
        if i < 0{
            if hold == 1{
                return math.MinInt
            }
            return 0
        }
        p := &memo[i][hold]
        if *p != -1{
            return *p
        }

        defer func(){
            *p = res
        }()

        if hold == 1{
            return max(dfs(i - 1, 1), dfs(i - 2, 0) - prices[i])
        }
        return max(dfs(i - 1, 0), dfs(i - 1, 1) + prices[i])
    }
    return dfs(n-1, 0)
}

func max(a, b int) int { if a < b { return b }; return a }
```



## 10.6｜[714. 买卖股票的最佳时机含手续费](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-with-transaction-fee/description/?envType=daily-question&envId=2023-10-06)

**思路**

使用记忆化搜索实现，在完成一笔交易时，减去手续费即可。

**代码实现**

```go
func maxProfit(prices []int, fee int) int {
    var n = len(prices)
    var dfs func(int, int) int
    var memory = make([][2]int, n)
    for i := range memory{
        memory[i] = [2]int{-1, -1}
    }
    
    dfs = func(i int, hold int) int{
        if i < 0{
            if hold == 1{
                return math.MinInt
            }
            return 0
        }

        if memory[i][hold] != -1{
            return memory[i][hold]
        }

        if hold == 1{
            memory[i][hold] = max(dfs(i - 1, 1), dfs(i - 1, 0) - prices[i] - fee)
            return memory[i][hold]
        }
        memory[i][hold] = max(dfs(i - 1, 0), dfs(i - 1, 1) + prices[i])
        return memory[i][hold]
    }
    return dfs(n - 1, 0)
}

func max(x, y int) int{
    if x > y{
        return x
    }
    return y
}
```



## 10.7｜[901. 股票价格跨度](https://leetcode.cn/problems/online-stock-span/?envType=daily-question&envId=2023-10-07)

**思路**

本题可以使用单调栈解决，栈内存放下标，另开一个数组存放历来的 price。

**代码实现**

```go
type StockSpanner struct {
    now int
    price []int // 存储价格
    s []int // 存储下标
}


func Constructor() StockSpanner {
    return StockSpanner{}
}


func (this *StockSpanner) Next(price int) int {
    var now = this.now
    var ans = 1
    for len(this.s) > 0 && this.price[this.s[len(this.s) - 1]] <= price{
        this.s = this.s[:len(this.s) - 1]
    }
    if len(this.s) > 0{
        ans = now - this.s[len(this.s) - 1]
    }else {
        ans = now + 1
    }

    this.s = append(this.s, now)
    this.price = append(this.price, price)
    now++
    this.now = now
    return ans
}


/**
 * Your StockSpanner object will be instantiated and called as such:
 * obj := Constructor();
 * param_1 := obj.Next(price);
 */
```



## 10.8｜[2034. 股票价格波动](https://leetcode.cn/problems/stock-price-fluctuation/description/?envType=daily-question&envId=2023-10-08)

**思路**

队列+哈希表，超时了。。。

可以改成两个优先队列。

**代码实现**

```go
type StockPrice struct {
    latestStamp int // 最大的时间戳
    price map[int]int // 存储时间戳对应的最新价格
    priQue [][2]int // 0 -> 时间戳， 1 -> 价格
}


func Constructor() StockPrice {
    price := make(map[int]int)
    priQue := make([][2]int, 0)
    return StockPrice{-1, price, priQue}
}


func (this *StockPrice) Update(timestamp int, price int)  {
    this.price[timestamp] = price

    if this.latestStamp < timestamp{
        // 更新最新的时间戳
        this.latestStamp = timestamp
    }

    // 维护一个尾小头大的队列
    var i = len(this.priQue) - 1
    for ; i >= 0; i--{
        if this.priQue[i][1] > price{
            // 获取第一个比它大的元素的下标
            break
        }
    }

    if i == -1{
        if len(this.priQue) != 0{
            temp := this.priQue
            defer func(){  
                this.priQue = append(this.priQue, temp...)
            }()
        }
        this.priQue = [][2]int{[2]int{timestamp, price}}
        return
    }

    tail := append([][2]int{}, this.priQue[i+1:]...)
    this.priQue = append(this.priQue[:i+1], [2]int{timestamp, price})
    this.priQue = append(this.priQue, tail...)
    return
}


func (this *StockPrice) Current() int {
    return this.price[this.latestStamp]
}


func (this *StockPrice) Maximum() int {
    maxStamp := this.priQue[0][0]
    maxPrice := this.priQue[0][1]
    for this.price[maxStamp] != maxPrice{
        this.priQue = this.priQue[1:]
        maxStamp = this.priQue[0][0]
        maxPrice = this.priQue[0][1]
    }
    return this.priQue[0][1]
}


func (this *StockPrice) Minimum() int {
    minStamp := this.priQue[len(this.priQue) - 1][0]
    minPrice := this.priQue[len(this.priQue) - 1][1]
    for this.price[minStamp] != minPrice{
        this.priQue = this.priQue[:len(this.priQue) - 1]
        minStamp = this.priQue[len(this.priQue) - 1][0]
        minPrice = this.priQue[len(this.priQue) - 1][1]
    }
    return this.priQue[len(this.priQue) - 1][1]
}


/**
 * Your StockPrice object will be instantiated and called as such:
 * obj := Constructor();
 * obj.Update(timestamp,price);
 * param_2 := obj.Current();
 * param_3 := obj.Maximum();
 * param_4 := obj.Minimum();
 */
```

```go
type StockPrice struct {
    maxPrice, minPrice hp
    timePriceMap       map[int]int
    maxTimestamp       int
}

func Constructor() StockPrice {
    return StockPrice{timePriceMap: map[int]int{}}
}

func (sp *StockPrice) Update(timestamp, price int) {
    heap.Push(&sp.maxPrice, pair{-price, timestamp})
    heap.Push(&sp.minPrice, pair{price, timestamp})
    sp.timePriceMap[timestamp] = price
    if timestamp > sp.maxTimestamp {
        sp.maxTimestamp = timestamp
    }
}

func (sp *StockPrice) Current() int {
    return sp.timePriceMap[sp.maxTimestamp]
}

func (sp *StockPrice) Maximum() int {
    for {
        if p := sp.maxPrice[0]; -p.price == sp.timePriceMap[p.timestamp] {
            return -p.price
        }
        heap.Pop(&sp.maxPrice)
    }
}

func (sp *StockPrice) Minimum() int {
    for {
        if p := sp.minPrice[0]; p.price == sp.timePriceMap[p.timestamp] {
            return p.price
        }
        heap.Pop(&sp.minPrice)
    }
}

type pair struct{ price, timestamp int }
type hp []pair
func (h hp) Len() int            { return len(h) }
func (h hp) Less(i, j int) bool  { return h[i].price < h[j].price }
func (h hp) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *hp) Push(v interface{}) { *h = append(*h, v.(pair)) }
func (h *hp) Pop() interface{}   { a := *h; v := a[len(a)-1]; *h = a[:len(a)-1]; return v }
```

