---
slug: shell-printf
title: Shell printf
sidebar_position: 7
---

# Shell printf

跟高级语言的 printf 差不多，语法也差不多，只不过少了个括号。

```shell
printf format-string [arguments]
```

format-string: 为格式控制字符串

arguments: 为参数列表

一个 demo 简单讲解：
**demo**

```shell
#!/bin/bash
# demo.sh
printf "name is %s, age is %d\n" hardews 20
```

