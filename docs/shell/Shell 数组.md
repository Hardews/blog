---
slug: shell-array
title: Shell 数组
sidebar_position: 4
---



# Shell 数组

## 常规数组

### 定义

Bash Shell 只支持一维数组，初始化时不需要定义数组大小，数组下标从零开始。

Shell 数组用括号表示，元素用空格分隔开。格式如下：

```shell
array_name=(val1, val2 ... valn)
```

以下语句可以创建一个简单的数组：

```shell
array=(A B "c" D)
```

也可以使用数字下标定义：

```shell
array[0]=val
array[1]=best
```

### 获取数组长度

只需要在数组前加个井号即可。

```shell
${#array_name[@]}
```

### 读取

和其他变量类似，加美元符号即可。

```shell
${array[index]}
# or 读取全部元素
${array[@]}
${array[*]}
```

## 关联数组

### 定义

Bash 支持关联数组，可以使用任意的字符串或者整数作为下标访问数组元素。

关联数组使用 declare 关键字声明：

```shell
declare -A array_name
```

-A 选项就是用于声明一个关联数组。关联数组的键是唯一的（有点像哈希表）。

如：

```shell
declare -A site=(["blog"]="https://hardews.cn/blog" ["note"]="https://hardews.cn/note")
# or
declare -A site
site["blog"]="https://hardews.cn/blog"
site["note"]="https://hardews.cn/note"
```

### 读取

访问键时的格式如下：

```shell
${array_name["index"]}
# or
${array_name[@]}
${array_name[*]}
```

并且，可以通过在数组前加上一个感叹号 ! 来获取这个数组的所有键。

```shell
${!array_name[@]}
```

其他的都差不多。



**小 demo**

```shell
#!/bin/bash
# demo.sh
arr1=(a b "c" d)
echo "this array length is ${#arr1[@]}"
for i in ${arr1[@]}; do
	echo "arr1 have val: ${i}"
done

declare -A arr2=(["blog"]="https://hardews.cn/blog" ["note"]="https://hardews.cn/note")
for key in ${!arr2[@]}; do
	echo "the key is ${key}, the val is ${arr2[${key}]}"
done
```

