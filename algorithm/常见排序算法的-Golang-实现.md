---
slug: sort-go
sidebar_position: 2
---



# 常见排序算法的 Golang 实现

## 前言

本文介绍并使用 go 语言实现了常见的几种排序算法，包括：冒泡排序、选择排序、插入排序、希尔排序、归并排序、快速排序、堆排序和基数排序。

附[代码仓](https://github.com/Hardews/go-algorithm)

本文代码对一些可以复用的函数进行了封装，如下：

```go
func swap(arr []int, i, j int) {
	arr[i], arr[j] = arr[j], arr[i]
}
```



<!--truncate-->

## 冒泡排序

### 介绍

冒泡排序的步骤如下：

1. 比较相邻的元素，如果第一个比第二个大，就交换这两个元素。
2. 对每一个相邻元素都进行同样的工作，从开始到结尾。每一步都需要确保最后一个元素是最大的元素。
3. 遍历直至最后一个元素

下面是图示。

![冒泡排序](https://www.runoob.com/wp-content/uploads/2019/03/bubbleSort.gif)

### 代码实现

```go
func BubbleSort(target []int) {
	for i := range target {
		// 遍历到 len(target) - i - 1 即可
		for j := 0; j < len(target)-i-1; j++ {
			if target[j] > target[j+1] {
				// 满足条件，交换
				temp := target[j]
				target[j] = target[j+1]
				target[j+1] = temp
			}
		}
	}
}
```

### 复杂度分析

**稳定性**：相邻元素相等时不会交换，所以它是稳定的。

**时间复杂度**：$$O(n^2)$$，是相邻元素之间的比较和交换，两重循环所以为 $$O(n^2)$$。

**空间复杂度**：$$O(n)$$，本算法不需要使用额外的空间。



## 选择排序

### 介绍

选择排序是一种简单直观的排序算法，实现步骤：

1. 在未排序的序列中找到最大（小）的元素，存放到已排序序列的末尾或顶端。
2. 重复第一步直到排序完成。

下面是图示。

![选择排序](https://www.runoob.com/wp-content/uploads/2019/03/selectionSort.gif)

### 代码实现

这里选择最小的元素，也就是升序排列。

```go
func SelectionSort(target []int) {
	for i := range target {
		// 记录下标
		var min = i
		for j := i; j < len(target); j++ {
			// 当前元素更小，交换下标
			if target[j] < target[min] {
				min = j
			}
		}
		// 最小的下标与当前下标交换
		temp := target[min]
		target[min] = target[i]
		target[i] = temp
	}
}
```

### 复杂度分析

**稳定性**：不稳定，因为选择完后会和当前元素交换。

**时间复杂度**：$$O(n^2)$$，两重循环。

**空间复杂度**：$$O(1)$$，不占用额外空间。



## 插入排序

### 介绍

插入排序我个人感觉跟冒泡差不多。它的原理跟整理扑克牌一样，拿出一张牌，然后和前面的进行比较，看插入到数组哪里合适。步骤如下：

1. 遍历到元素的前面是已排序的，后面是未排序的。
2. 当前元素与排好序的元素进行比较，找到合适的位置插入。

以下是图示：

![插入排序](https://www.runoob.com/wp-content/uploads/2019/03/insertionSort.gif)

### 代码实现

```go
func InsertionSort(target []int) {
	for i := range target {
		// 前一个元素
		preIndex := i - 1
		current := target[i]
		// 从小到大排序
		for preIndex >= 0 && current < target[preIndex] {
			// 前后俩元素交换，直到找到要插入的 index
			target[preIndex+1] = target[preIndex]
			preIndex--
		}
		target[preIndex+1] = current
	}
}
```

### 复杂度分析

**稳定性**：稳定，元素相同时还是会排在它后面。

**时间复杂度**：$$O(n^2)$$，两重循环。

**空间复杂度**：$$O(1)$$，未使用到额外空间。



## 希尔排序

### 介绍

希尔排序是插入排序的改进。它基于插入排序的两点性质提出改进方法：

1. 插入排序对于几乎排好序的数据进行操作时，效率更高
2. 插入排序每次只能将数据移动一位（也就是交换的时候）

希尔排序的思想是，先将待排序的记录序列分割成若干个子序列进行插入排序，然后等整个序列基本有序后，对整个序列进行插入排序。

没有找到很好的图，它的步骤是：

1. 定义一个增量 gap，一般来说初始值为 len(target) / 2
2. 每相隔 gap 的各元素组成一组，比如数组 [1,2,3,4,5,6,7,8]，现在 gap 是 4 的话，元素 1（下标 0）的同组元素为 5（下标 4，0 + gap）；元素 2（下标 1）的同组元素为 6（下标 5）。
3. 对每一组的元素进行直接插入排序。
4. 缩小 gap 直到为 1。
5. 重复 2 - 4。

### 代码实现

```go
func ShellsSort(target []int) {
	var gap int = len(target) / 2
	for gap > 0 {
		for i := gap; i < len(target); i++ {
			// 从第一个 gap 开始遍历
			// 上一个元素为 i - gap
			preIndex := i - gap
			current := target[i]
			for preIndex >= 0 && current < target[preIndex] {
				// 插入排序
				target[preIndex+gap] = target[preIndex]
				preIndex -= gap
			}
			target[preIndex+gap] = current
		}
		gap /= 2
	}
}
```

### 复杂度分析

**稳定性**：不稳定，因为分割成几个子序列

**时间复杂度**：$$O(nlogn)$$

**空间复杂度**：$$O(1)$$，不需要额外空间



## 归并排序

### 介绍

这是一个典型的分治思想算法。它有两种实现方法：迭代和递归。

步骤是：

1. 将需要排序的数组一分为二，直至数组只剩一个元素
2. 拆分成的数组进行比较，将其按大小顺序放入额外数组空间 res。
3. 不断重复步骤直至排序成功。

我觉得看图示更通俗易懂：

![归并排序](https://pic4.zhimg.com/v2-a29c0dd0186d1f8cef3c5ebdedf3e5a3_b.webp)

### 代码实现

递归实现

```go
func MergeSort(target []int) []int {
	if len(target) < 2 {
		// 只剩一个元素或者没元素了就可以返回
		return target
	}
	mid := len(target) / 2
	left := target[:mid]
	right := target[mid:]
	return merge(MergeSort(left), MergeSort(right))
}

func merge(left, right []int) []int {
	var res []int
	for len(left) != 0 && len(right) != 0 {
		if left[0] < right[0] {
			res = append(res, left[0])
			left = left[1:]
		} else {
			res = append(res, right[0])
			right = right[1:]
		}
	}

	if len(left) == 0 {
		res = append(res, right...)
	}

	if len(right) == 0 {
		res = append(res, left...)
	}

	return res
}
```



### 复杂度分析

**稳定性**：不稳定

**时间复杂度**：$$O(nlogn)$$

**空间复杂度**：$$O(n)$$，可以不使用额外空间，但时间复杂度会有所上升，得不偿失。



## 快速排序

### 介绍

快速排序也是一种利用分治思想的排序方法。它的步骤是：

1. 从序列中随机挑选一个元素，叫做 “基准”（pivot）
2. 重新排序数列，所有元素比基准值小的摆放在基准前面，所有元素比基准值大的摆在基准的后面（相同的数可以到任一边）。在这个分区退出之后，该基准就处于数列的中间位置。这个称为分区（partition）操作；
3. 递归地（recursive）把小于基准值元素的子数列和大于基准值元素的子数列排序；

图示：

![快速排序](https://www.runoob.com/wp-content/uploads/2019/03/quickSort.gif)

### 代码实现

递归实现

```go
func QuickSort(target []int) []int {
	return quickSort(target, 0, len(target)-1)
}

func quickSort(target []int, left, right int) []int {
	if left < right {
		// 跟树的遍历差不多
		mid := partition(target, left, right)
		// 这里是 左边 到 中间值 -1（因为左右两边是围绕中间值排序的，中间值不用再排了
		quickSort(target, left, mid-1)
		// 中间值 + 1 到 右边
		quickSort(target, mid+1, right)
	}
	return target
}

func partition(target []int, left, right int) int {
	pivot := left
	pivotNum := target[pivot]
	for left < right {
		if target[right] >= pivotNum {
			right--
			continue
		}
		if target[left] <= pivotNum {
			left++
			continue
		}

		// 到这里证明它们要交换了
		swap(target, left, right)
	}
	// 循环结束， left == right
	swap(target, left, pivot)

	// 返回中间的值
	return left
}
```

### 复杂度分析

**稳定性**：不稳定

**时间复杂度**：$$O(nlogn)$$

**空间复杂度**：$$O(1)$$，不需要额外空间



## 堆排序

### 介绍

堆排序是利用堆这个数据结构来进行排序的算法。堆一般指的是二叉堆，它是完全二叉树或者近似完全二叉树。

堆的性质：

- 如果这个堆的每个节点的值，都大于其子节点的值，那么它被称为最大堆。反之为最小堆。
- 一个下标为 $$i$$ 的节点，它的左子节点的下标是 $$2 * i + 1$$，它的右子节点的下标是 $$2 * i + 2$$。

堆排序的步骤是：

1. 先将给定数组 target 建立成最大堆，堆顶为最大的元素。建立最大堆的步骤：
   1. 初始时堆是无序堆，我们从最后一个非终端节点（$$i  < len(target) / 2$$)开始，如果子节点比父节点大，交换，否则，继续遍历。
   2. 遍历这个堆直至堆顶为最大元素。
2. 最大堆调整。
   1. 将堆顶元素与堆底元素进行替换。
   2. 堆顶元素变为原来的堆底元素，此时最大堆已经不是最大堆了，下沉这个堆顶使其重新变成最大堆。
   3. 重复 1- 2 直至堆只剩一个元素。

### 代码实现

```go
func HeapSort(target []int) {
	// 创建最大堆
	shiftDown(target)
	arrLen := len(target)
	for i := len(target) - 1; i >= 0; i-- {
		swap(target, 0, i)
		arrLen -= 1
		heapify(target, 0, arrLen)
	}
}

// shiftDown 创建最大堆
func shiftDown(target []int) {
	for i := len(target) / 2; i >= 0; i-- {
		heapify(target, i, len(target))
	}
}

// heapify 以传入参数为堆顶，调整最大堆
func heapify(target []int, start, end int) {
	var largest = start
	var left = 2*start + 1  // 左子节点
	var right = 2*start + 2 // 右子节点
    
	// 比较左节点
	if left < end && target[left] > target[largest] {
		largest = left
	}

	// 比较右节点
	if right < end && target[right] > target[largest] {
		largest = right
	}

	if largest != start {
		// 堆顶不是最大值了，下沉
		swap(target, start, largest)
		heapify(target, largest, end)
	}
}
```

### 复杂度分析

**稳定性**：不稳定

**时间复杂度**：$$O(nlogn)$$

**空间复杂度**：$$O(1)$$，未使用额外空间



## 基数排序

### 介绍

基数排序利用了桶的概念。它的算法步骤一句话就可以总结：找到数组元素中的最大位数，根据最大位数将数组按位进行排序，位对应数字放入对应的桶中，从个位到最高位。

图示：

![基数排序](https://www.runoob.com/wp-content/uploads/2019/03/radixSort.gif)

### 代码实现

```go
func RadixSort(target []int) {
	// 找到最大位
	var max int
	for _, num := range target {
		if num > max {
			max = num
		}
	}

	var maxBit int
	for max > 0 {
		max /= 10
		maxBit++
	}

	for i := 1; i <= maxBit; i++ {
		bitSort(target, 10, i)
	}
}

// bitSort bit 当前位，个位是 1，scale 进制，10 进制为 10
func bitSort(target []int, scale, bit int) {
	// 初始化一个桶
	var buket = make([][]int, scale)
	for _, num := range target {
		// 获取当前位的数字
		bitDiv := (bit - 1) * 10
		if bitDiv == 0 {
			bitDiv = 1
		}
		bitNum := (num / bitDiv) % 10
		// 放入桶
		buket[bitNum] = append(buket[bitNum], num)
	}

	// 将桶中的元素依次放进 target 中
	var i int
	for j := range buket {
		for _, num := range buket[j] {
			target[i] = num
			i++
		}
	}
}
```

### 复杂度分析

**稳定性**：稳定

**时间复杂度**：$$O(n)$$

**空间复杂度**：$$O(rn)$$，r 为进制。