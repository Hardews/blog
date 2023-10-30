---
slug: shell-test
title: Shell test
sidebar_position: 8
---



# Shell test

shell 中的 test 命令可以用于检查某个条件是否成立，可以进行数值、字符和文件三个方面的测试。

条件命令在之前文章中有所讲解，这里不再赘述。

对于 test 命令，它的大致语法是

```shell
test 条件式
```

demo

```shell
#!/bin/bash
# demo.sh

num1=100
num2=100

if test ${num1} -eq ${num2}
then
	echo "两数相等"
else
	echo "两数不等"
fi
```

