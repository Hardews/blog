---
slug: shell-variable
title: Shell 变量
sidebar_position: 2
---





# Shell 变量

本节是 Shell 变量相关的知识点

## 变量的各种姿势

### 定义变量

Shell 的变量定义不同于其他高级语言，变量的命名的规则如下：

- 只能使用英文字母、数字和下划线。且首个字符不能以数字开头
- 中间不能有空格
- 不能使用标点符号
- 不能使用 bash 里的关键字

如：

```shell
var_name="hardews"
```

需要注意的是，变量名与等号之间不能有空格。

也可以使用语句给变量赋值（感觉和 Python 很像）

```shell
# 将 /etc 下的所有文件名循环赋值给 file
for file in `ls /etc` 
# or
for file in $(ls /etc)
```

### 使用变量

使用变量只需要在前面加美元符号即可。而花括号则是可以定义变量的边界

像刚才的第一个例子

```shell
name="hardews"
echo $var_name
echo ${var_name}
```

第二个例子

```shell
for filename in `ls /opt`; do
	echo "filename is ${filename} in opt"
done
```

已定义的变量，可以被重新定义（也就是重新赋值）。

```shell
var_name="hardews"
echo ${var_name}
var_name="牛肉拌面"
echo ${var_name}
```

注意，只有使用变量时才需要加美元符号。

**完整 demo**

```shell
#!/bin/bash
# var1.sh
name="hardews"
echo ${name}
echo $name

for filename in `ls /opt`; do
	echo "filename is ${filename} in opt"
done

name="牛肉拌面"
echo ${name}
```



### 只读变量

使用 readonly 关键字可以将变量定义为只读变量，只读变量的值不可改变。

比如：

```shell
#!/bin/bash
# var2.sh
myBlog="https://hardews.cn"
readonly myBlog
myBolg="https://hardews.cn/blog"
echo ${myBlog}
```

运行后不会报错，但是会发现 myBlog 的值并没有改变

```shell
https://hardews.cn
```

### 删除变量

我们可以通过 unset 命令删除一个变量。变量被删除后不能被再次使用。并且无法删除只读变量。

比如：

```shell
#!/bin/bash
# var2.sh
myBlog="https://hardews.cn"
myGithub="https://github.com/hardews"
readonly myBlog
echo ${myBlog}
echo ${myGithub}

unset myBlog
unset myGithub
echo ${myBlog}
echo ${myGithub}
```

输出：

```shell
https://github.com/hardews
./var2.sh: line 12: unset: myBlog: cannot unset: readonly variable
https://hardews.cn
# 这是被删除后输出的空行
```

可以看到有提示，unset 不能将其删除

完整 demo:

```shell
#!/bin/bash
# var2.sh
myBlog="https://hardews.cn"
readonly myBlog
myBolg="https://hardews.cn/blog"
echo ${myBlog}

myGithub="https://github.com/hardews"
echo ${myBlog}
echo ${myGithub}

unset myBlog
unset myGithub
echo ${myBlog}
echo ${myGithub}
```

### 变量类型

运行 Shell 程序时，会同时存在三种变量：

- 局部变量，顾名思义，只能在当前 Shell 实例中有效的变量
- 环境变量，所有的程序都能访问到环境变量。必要时 Shell 脚本也可以定义环境变量
- Shell 变量，即 Shell 程序设置的特殊变量



## Shell 字符串

字符串可以使用单引号，亦可以使用双引号。

### 单引号

限制：

- 单引号字符串任何字符都会原样输出，变量是无效的
- 不能出现单独的单引号（转义也不行），但可以成对出现，作为字符串拼接使用

如：

```shell
str='this is a string'
echo ${str}
name='haredws'
str='this is ${name}'
echo ${str}
```

输出：

```shell
this is a string
this is ${name}
```

### 双引号

优点：

- 双引号里可以有变量
- 双引号里可以有转义字符

如：

```shell
t_str="I'm 牛肉拌面."
echo ${t_str}

t_str="I'm ${name}"
echo ${t_str}

t_str="I'm \"Iron\" man"
# 这里的 -e 表示输出转义字符
echo ${t_str}
```

输出：

```sh
I'm 牛肉拌面.
I'm haredws
-e I'm "Iron" man
```

### 字符串拼接

Shell 中的字符串拼接不需要 + 号或者什么符号。直接将两个字符串放在一起即可。

比如：

```shell
# 输出时拼在一起
echo ${str}${name}

# 双引号拼接
str2="hello, "${name}", Welcome!"
str3="hello, ${name}, Welcome!"
echo ${str2} ${str3}

# 单引号拼接
str3='hello, '${name}', Welcome!'
str4='hello, ${name}, Welcome!'
echo ${str2} ${str3}
```

输出：

```sh
I'm "Iron" manharedws
hello, haredws, Welcome! hello, haredws, Welcome!
hello, haredws, Welcome! hello, haredws, Welcome!
```

### 获取字符串长度

我们可以通过关键字 # 来获取一个字符串的长度：

```shell
len_test="abcd"
echo ${#len_test} # output: 4
echo ${#len_test[0]} # output: 4，与上面是等价的
```

输出：

```shell
4
4
```

### 提取子字符串

可以通过索引提取子字符串

```shell
# 索引从 0 开始
echo ${len_test:1:2} # output: bc
echo ${len_test:1:3} # output: bcd
```

输出：

```shell
bc
bcd
```

### 查找子字符串

查找字符第一次出现的位置

```shell
echo `expr index "$len_test" ac` # 这里是找 a 或者 c 第一次出现的位置
# output: 1
```

**完整 demo**

```shell
echo ${str}
name='haredws'
str='this is ${name}'
echo ${str}

t_str="I'm 牛肉拌面."
echo ${t_str}

t_str="I'm ${name}"
echo ${t_str}

t_str="I'm \"Iron\" man"
# 这里的 -e 表示输出转义字符
echo -e ${t_str}

# 输出时拼在一起
echo ${t_str}${name}

# 双引号拼接
str2="hello, "${name}", Welcome!"
str3="hello, ${name}, Welcome!"
echo ${str2} ${str3}

# 单引号拼接
str3='hello, '${name}', Welcome!'
str4='hello, ${name}, Welcome!'
echo ${str2} ${str3}

len_test="abcd"
echo ${#len_test} # output: 4
echo ${#len_test[0]} # output: 4，与上面是等价的

# 索引从 0 开始
echo ${len_test:1:2} # output: bc
echo ${len_test:1:3} # output: bcd

echo `expr index "$len_test" ac` # 这里是找 a 或者 c 第一次出现的位置
```

