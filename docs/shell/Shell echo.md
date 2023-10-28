---
slug: shell-variable
title: Shell echo
sidebar_position: 6
---



# Shell echo

简单的形式就是：

```shell
echo string
```

也可以使用更复杂的输出格式控制：

## 显示普通字符串

```shell
echo "this is a string"
# or
echo this is a string
```

## 显示转义字符

```shell
echo "\"this is a string"\"
# or
echo \"this is a string\"
```

## 显示变量

```shell
#!/bin/bash
# demo1.sh
# read 从标准输入中读取一行，并把输入行的字段值给定 shell 变量
read name
echo "name is ${name}"
```

像这样:

```sh
root@aaa:/opt/shell-study/part-6# ./demo1.sh
hardews
name is hardews
```

## 显示换行

```shell
echo -e "OK \n"
echo "↑ have a space"
```

## 显示不换行

```shell
#!/bin/bash
echo -e "OK! \c"
echo "We together!"
```

发现会输出：

```sh
OK! We togerther!
```

## 将结果定向至文件

```shell
echo "insert a string" > myfile
```

## 原样输出字符串

```shell
echo '$name\"'
```

## 显示命令执行结果

```shell
# 显示当前日期
echo `date`
```



**demo**

```shell
#!/bin/bash
# demo2.sh

echo "this is a simple string"
echo "\"this is a simple string\""

a="hardews"
echo "I'm Hardews"
echo -e "I \n"
echo "am Hardews"
echo -e "I am \c"
echo "Hardews"
echo 'I\"666'
echo `date`
```

