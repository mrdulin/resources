title: bower cache
date: 2013-2-18 10:34:03
tags:
- bower
- 包管理工具
- web
- 前端开发
categories:
- bower

---


__bower cache__

功能：管理包缓存

windows用户，在C:\Users\dulin\AppData\Local\bower\cache\packages目录下就是bower安装过的所有包的缓存

<!-- more -->

用法：

```cmd
$ bower cache

Usage:

    bower cache <command> [<args>] [<options>]
Commands:

    clean                   Clean cached packages
    list                    List cached packages
```

使用`list`命令列出安装过的所有包的缓存

```cmd
$ bower cache list
angular=git://github.com/angular/bower-angular.git#1.3.15
angular-animate=git://github.com/angular/bower-angular-animate.git#1.3.15
angular-route=git://github.com/angular/bower-angular-route.git#1.3.15
angular-touch=git://github.com/angular/bower-angular-touch.git#1.3.15
jquery=git://github.com/jquery/jquery.git#2.1.4
Mock.js=git://github.com/nuysoft/Mock.git#0.1.9
```

使用`clean`命令清除安装过的所有包的缓存

```cmd
$ bower cache clean
bower deleted       Cached package angular: C:\Users\dulin\AppData\Local\bower\cache\packages\ef2188def21eb1bbd1f1792311942a53\1.3.15
bower deleted       Cached package angular-touch: C:\Users\dulin\AppData\Local\bower\cache\packages\8926838ac25d624594e3d6618381d070\1.3.15
bower deleted       Cached package angular-route: C:\Users\dulin\AppData\Local\bower\cache\packages\a79b04bbe7ddc8d7be946d2012fca5b7\1.3.15
bower deleted       Cached package angular-animate: C:\Users\dulin\AppData\Local\bower\cache\packages\1e5d36753a7672512aa68fc8cdf5a6ce\1.3.1
5
bower deleted       Cached package jquery: C:\Users\dulin\AppData\Local\bower\cache\packages\fe2fe255e91d251051d543998aa8327a\2.1.4
bower deleted       Cached package Mock.js: C:\Users\dulin\AppData\Local\bower\cache\packages\c6f933bc2d5129e99678e3ca643531ad\0.1.9
```

再次使用`list`命令查看，包的缓存已经被清理删除了

```cmd
$ bower cache list
```

进入`C:\Users\dulin\AppData\Local\bower\cache\packages`查看，缓存的包文件确实被删除了。

__从本地缓存中安装包:__

`bower`支持离线，从本地缓存中安装包，前提是缓存中有这个包。

离线安装包：

```cmd
$bower install <package> --offline
```

__补充：__

查看指定包名的缓存，只需要指定包名就可以了，例如

```cmd
$ bower cache list jquery
jquery=git://github.com/jquery/jquery.git#2.1.4
```

查看多个指定包名的缓存，包名之间用空格分隔

```cmd
$ bower cache list jquery Mock.js
jquery=git://github.com/jquery/jquery.git#2.1.4
Mock.js=git://github.com/nuysoft/Mock.git#0.1.9
```

__说明:__=号前面的是包名，#号后面的是包的版本。查看指定包名的缓存，在一个包存在多个版本时有用。

同理，清除指定包的缓存

```cmd
$ bower cache clean jquery
bower deleted       Cached package jquery: C:\Users\dulin\AppData\Local\bower\cache\packages\fe2fe255e91d251051d543998aa8327a\2.1.4
```

清除指定版本的包的缓存，需要在包名后加`#<version>`

```cmd
$ bower cache clean jquery-ui#1.11.4
bower deleted       Cached package jquery-ui: C:\Users\dulin\AppData\Local\bower\cache\packages\3725aca888af41d0b2de2b0b81f8307b\1.11.4
```

清楚多个指定版本的包的缓存，包名之间用空格分隔

```cmd
$ bower cache clean jquery#2.1.4 Mock.js#0.1.9
bower deleted       Cached package jquery: C:\Users\dulin\AppData\Local\bower\cache\packages\fe2fe255e91d251051d543998aa8327a\2.1.4
bower deleted       Cached package Mock.js: C:\Users\dulin\AppData\Local\bower\cache\packages\c6f933bc2d5129e99678e3ca643531ad\0.1.9
```

