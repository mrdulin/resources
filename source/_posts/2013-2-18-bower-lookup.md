title: bower lookup
date: 2013-2-18 10:34:03
tags:
- bower
- 包管理工具
- web
- 前端开发
categories:
- bower

---

__bower lookup__

功能：通过包名来查找该包的URL地址。

<!-- more -->

用法：`bower lookup <name> [<options>]`

`name`为要查找的包名，必需。

`options`可选。

例1:

```cmd
E:\bk\webpack>bower lookup jquery
jquery git://github.com/jquery/jquery.git
```

例2:

```cmd
E:\bk\webpack>bower lookup requirejs
bower retry         Request to https://bower.herokuapp.com/packages/requirejs failed with ETIMEDOUT, retrying in 1.9s
requirejs git://github.com/jrburke/requirejs-bower.git
```

例3:

```cmd
E:\bk\webpack>bower lookup angular
angular git://github.com/angular/bower-angular.git
```

bower lookup 会先从本地cache中查找包，除非使用`--force`参数
[源码](https://github.com/bower/registry-client/blob/master/lib/lookup.js#L28-L50)
