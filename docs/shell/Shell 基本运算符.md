---
slug: shell-basic-operator
title: Shell 基本运算符
sidebar_position: 5
---



# Shell 基本运算符

Shell 和其他语言一样，支持多种运算符。包括：

- 算术运算符
- 关系运算符
- 布尔运算符
- 字符串运算符
- 文件测试运算符

原生的 Bash 不支持简单的数学运算，但是可以通过其他命令来实现。例如 awk，expr。

expr 时最常用的关键字，它是一款表达式计算工具。使用它能完成表达式的求值操作。

比如：

```shell
val=`expr 2 + 2`
```

需要注意的是：

- 表达式和运算符之间需要有空格，比如 2+2 是错误的。
- 完整的表达式需要被反引号包含。

下面介绍常见的几种运算符。

## 算术运算符

| 运算符 | 说明                                      | 例子                |
| ------ | ----------------------------------------- | ------------------- |
| +      | 加法                                      | `expr ${a} + ${b}`  |
| -      | 减法                                      | `expr ${a} - ${b}`  |
| *      | 乘法，需要注意的是乘号前边要加反斜杠。    | `expr ${a} \* ${b}` |
| /      | 除法                                      | `expr ${a} / ${b}`  |
| %      | 取余                                      | `expr ${a} % ${b}`  |
| =      | 赋值                                      | `a=${b}`            |
| ==     | 比较两个参数是否相等，相等返回 true。     | `[ $a == $b ]`      |
| !=     | 比较两个参数是否不相等，不相等返回 true。 | `[ $a != $b ]`      |

**demo1**

```shell
#/bin/bash
# demo1.sh

a=20
b=10

# +
ans=`expr ${a} + ${b}`
echo "ans is ${ans}"
# -
ans=`expr ${a} - ${b}`
echo "ans is ${ans}"
# *
ans=`expr ${a} \* ${b}`
echo "ans is ${ans}"
# /
ans=`expr ${a} / ${b}`
echo "ans is ${ans}"
# %
ans=`expr ${a} % ${b}`
echo "ans is ${ans}"

if [ ${a} == ${b} ]
then
	echo "a == b"
fi

if [ ${a} != ${b} ]
then
	echo "a != b"
fi
```



## 关系运算符

关系运算符，只支持数字，不支持字符串。（除非字符串的值是数字）

| 运算符 | 说明            | 例子                 |
| ------ | --------------- | -------------------- |
| -eq    | a == b 是否成立 | `expr [ $a -eq $b ]` |
| -ne    | a != b 是否成立 | `expr [ $a -nq $b ]` |
| -gt    | a > b 是否成立  | `expr [ $a -gt $b ]` |
| -lt    | a < b 是否成立  | `expr [ $a -lt $b ]` |
| -ge    | a > b 是否成立  | `expr [ $a -ge $b ]` |
| -le    | a < b 是否成立  | `expr [ $a -le $b ]` |

**demo2**

```shell
#!/bin/bash
# demo2.sh

a=10
b=20

if [ ${a} -eq ${b} ]
then
	echo "a == b"
fi

if [ ${a} -nq ${b} ]
then
	echo "a != b"
fi

if [ ${a} -gt ${b} ]
then
	echo "a > b"
fi

if [ ${a} -lt ${b} ]
then
	echo "a < b"
fi

if [ ${a} -ge ${b} ]
then
	echo "a > b"
fi

if [ ${a} -le ${b} ]
then
	echo "a < b"
fi
```

## 逻辑运算符

| 运算符 | 说明 | 例子                         |
| ------ | ---- | ---------------------------- |
| &&     | AND  | `[ $a -eq $b && $a -gt $b ]` |
| \|\|   | OR   | `[ $a -lq $b || $a -lt $b ]` |

**demo3**

```shell
#!/bin/bash
# demo3.sh

a=10
b=5

if [[ ${a} -gt 5 && ${b} -gt 10 ]]
then
        echo "表达式的结果是：true"
else
        echo "表达式的结果是：false"
fi

if [[ ${a} -gt 5 || ${b} -gt 10 ]]
then
        echo "表达式的结果是：true"
else
        echo "表达式的结果是：false"
fi
```

## 字符串运算符

| 运算符 | 说明                 | 例子           |
| ------ | -------------------- | -------------- |
| =      | 两个字符串是否相等   | `[ $a = $b ]`  |
| !=     | 两个字符串是否不相等 | `[ $a != $b ]` |
| -z     | 字符串长度是否为 0   | `[ -z $a ]`    |
| -n     | 字符串长度是否不为 0 | `[ -n $a ]`    |
| $      | 字符串是否不为空     | `[ $a ]`       |

**demo4**

```shell
#!/bin/bash
# demo4.sh

a="abc"
b="def"

if [ $a = $b ]
then
	echo "a == b"
fi

if [ $a != $b ]
then
	echo "a != b"
fi

if [ -z $a ]
then
	echo "字符串 a 的长度为 0"
fi

if [ $a ]
then
	echo "字符串 a 不为空"
fi

if [ -n $b ]
then
	echo "字符串 b 的长度不为 0"
fi
```

## 文件测试运算符

这里列出常用的：

| 操作符  | 说明                                 |
| ------- | ------------------------------------ |
| -d file | 当前文件是否是目录                   |
| -f file | 当前文件是否为普通文件（非设备文件） |
| -r file | 当前文件是否可读                     |
| -w file | 当前文件是否可写                     |
| -x file | 当前文件是否可执行                   |
| -s file | 当前文件是否不为空                   |
| -e file | 当前文件或目录是否存在               |

