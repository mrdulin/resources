title: bower unregister
date: 2013-2-18 10:34:03
tags:
- bower
- 包管理工具
- web
- 前端开发
categories:
- bower

---


__bower unregister__

功能：注销一个包。

<!-- more -->

```cmd
bower unregister <package>
```

当你想注销自己发布的包时使用。

例：
```cmd
E:\bk\webpack>bower unregister learn-bower
? You are about to remove component "learn-bower" from the bower registry (https://bower.herokuapp.com). It is generally considered bad behavior to remove versions of a library that others are dependi
ng on. Are you really sure? Yes
bower unregister    learn-bower
bower Package unregistered      learn-bower
```

现在注销了learn-bower这个包

查看一下包是否还在：

```cmd
E:\bk\webpack>bower lookup learn-bower
learn-bower git://github.com/Sspeed5cm/learn_bower.git
```

还在，清除一下缓存

```cmd
E:\bk\webpack>bower cache clean
```

再查找一下：

```cmd
E:\bk\webpack>bower lookup learn-bower
Package not found.
```
不在了，再确认下：

```cmd
E:\bk\webpack>bower info learn-bower
bower                        ENOTFOUND Package learn-bower not found
```
