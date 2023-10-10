---
slug: leetcode-weekly
sidebar_position: 1
---



# LeetCode 周赛总结

希望有朝一日能做周赛四题郎T_T

| 题目总览                                                     | 日期      | AC   | TLE  |
| ------------------------------------------------------------ | --------- | ---- | ---- |
| [第 114 场双周赛](https://leetcode.cn/contest/biweekly-contest-114/) | 2023.9.30 | 2    | 1    |

<!--truncate-->

## 第 114 场双周赛

### [8038. 收集元素的最少操作次数](https://leetcode.cn/problems/minimum-operations-to-collect-elements/description/)

**思路 & 代码实现**

维护一个哈希表，记录下当前收集到的元素，当元素数量符合要求时，返回结果。

```go
func minOperations(nums []int, k int) int {
    var temp = make(map[int]struct{})
    i := len(nums) - 1
    
    for ; i >= 0; i--{
        if len(temp) == k{
            break
        }
        if _, ok := temp[nums[i]]; !ok && nums[i] <= k{
            // 收集到的
            temp[nums[i]] = struct{}{}
        }
    }
    return len(nums) - i - 1
}
```

**改进 & 代码实现**

看了题解以后，发现可以用位运算解决这个问题。那么定义一个集合 all，每当收集到一个元素，all 对应的位变为 1。当 all 与 k 进行位运算得到本身时，收集到所有元素，返回结果。

```go
func minOperations(nums []int, k int) int {
    var all  = 2 << k - 2 // 1~k 位全为 1
    var i = len(nums) - 1
    var set = 0
    
    for ; i >= 0; i--{
        set |= 1 << nums[i]
        if all & set == all{
            break
        }
    }
    return len(nums) - i
}
```



### [100032. 使数组为空的最少操作次数](https://leetcode.cn/problems/minimum-number-of-operations-to-make-array-empty/description/)

**思路 & 代码实现**

统计出每个元素出现的次数，然后遍历这个统计出来的哈希表，每个元素贪心的计算（先减 3，不行就先减 2），如果 3 和 2 都不行，那么就不可以使其为空，返回 -1。

```go
func minOperations(nums []int) int {
    var m = make(map[int]int)
    for _, num := range nums {
        if _, ok := m[num]; ok{
            m[num]++
        }else{
            m[num] = 1
        }
    }
    var ans int
    for _, val := range m{
        for val > 0{
            if (val - 3) % 2 == 0 || (val - 3) % 3 == 0{
                ans++
                val -= 3
                continue
            }
            
            if (val - 2) % 2 == 0 || (val - 2) % 3 == 0{
                val -= 2
                ans++
                continue
            }
            return -1
        }
        if val != 0{
            return -1
        }
    }
    
    return ans
}
```



### [100019. 将数组分割成最多数目的子数组](https://leetcode.cn/problems/split-array-into-maximum-number-of-subarrays/description/)

**思路 & 代码实现**

没写出来，想着用回溯，但是超时了。

```go
func maxSubarrays(nums []int) int {
    var n = len(nums)
    var ans = 1
    var minScore = score(nums)
    var path []int
    var dfs func(int, int)
    
    dfs = func(i, start int){
        if i == n{
            p := append([]int{}, path...)
            nowScore := sum(p)
            
            if len(p) > 1 && nowScore <= minScore{
                minScore = nowScore
                
                ans = max(len(p), ans)
            }
            return
        }
        
        if i < n - 1{
            // 当前逗号不选
            // 最后一个必须选
            dfs(i + 1, start)
        }
        
        // 当前逗号选择
        s := score(nums[start:i + 1])
        
        path = append(path, s)
        dfs(i + 1, i + 1)
        
        // 恢复现场
        path = path[:len(path) - 1]
    }
    
    dfs(0, 0)
    return ans
}

func score(nums []int) int{
    ans := nums[0]
    for i := range nums{
        ans = ans & nums[i]
    }
    return ans
}

func sum(nums []int) int{
    var ans int
    for i := range nums{
        ans += nums[i]
    }
    return ans
}

func max(x, y int) int{
    if x > y{
        return x
    }
    return y
}
```

**改进 & 代码实现**

性质：

- **按位与运算参与的元素越多，结果越小**

根据这个性质，可以贪心的计算最小的代价。

```go
func maxSubarrays(nums []int) int {
    var ans int
    var a = -1 // 全是 1
    for i := range nums{
        a &= nums[i]
        if a == 0{
            // 分割
            ans++
            a = -1
        }
    }
    return max(ans, 1)
}

func max(x, y int) int{
    if x < y{
        return y
    }
    return x
}
```

