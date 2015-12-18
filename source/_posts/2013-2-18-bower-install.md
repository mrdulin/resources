title: bower install
date: 2013-2-18 10:34:03
tags:
- bower
- 包管理工具
- web
- 前端开发
categories:
- bower

---

__bower install__

功能： 安装项目依赖的包

<!-- more -->

语法：

```bat
$ bower install [<options>]
$ bower install <endpoint> [<endpoint> ..] [<options>]
```

<!-- more -->


端点（endpoint）可以是如下形式：

*	`<package>`

*	`<package>#<version>`

*	`<name>=<package>#<version>`

__说明:__

*	`<package>`可以是一个包的URL链接地址，本地地址或者注册的包名

*	`<version>`是包的有效版本号范围中的一个值

*	`<name>`是指定的本地包名

`<package>`可以是如下任何一种形式:

*	注册的包名：如`jquery,angular-animate`

*	Git版本库地址： 如`https://github.com/jquery/jquery.git`

*	Git版本库地址，省略`.git`：如`https://github.com/jquery/jquery`

*	本地包所在文件夹地址： `my/local/folder/`

*	公开的svn版本库地址：`svn+http://package.googlecode.com/svn/`

*	私有的svn版本库地址：`svn+ssh://package.googlecode.com/svn/`, 
	`svn+https://package.googlecode.com/svn/`

*	URL地址： 
	`http://example.com/script.js`
	`http://example.com/style.css`

`<version>`版本号可以是

*	确定的版本号：`#1.2.3`
*	版本号范围： `#1.2`,`#~1.2.3`,`#^1.2.3`,`#>=1.2.3 <2.0`

`<options>`介绍

*   -F,或者--force-latest: 暂无

*   -P,或者--production: 不在devDependencies中添加该包名

*   -S,或者--save: 在项目根目录下的’bower.json’文件中的dependencies字段中添加该包名作为项目依赖

*   -D,或者--save-dev: 在项目根目录下的’bower.
json’文件中的dependencies字段和devDependencies字段添加该包名作为项目依赖

*   -E,或者--save-exact: 暂无

一个例子：

```bat
dulin@IT01010030921 /e/website/jquery-plugins (master)
$ bower uninstall jquery -D
bower conflict      jquery-ui depends on jquery
? Continue anyway? Yes
bower uninstall     jquery

dulin@IT01010030921 /e/website/jquery-plugins (master)
$ bower cache list
jquery=git://github.com/jquery/jquery.git#2.1.4

dulin@IT01010030921 /e/website/jquery-plugins (master)
$ bower install jquery --offline -P
bower jquery#>=1.6              cached git://github.com/jquery/jquery.git#2.1.4
bower jquery#~2.1.4             cached git://github.com/jquery/jquery.git#2.1.4
bower jquery#*                  cached git://github.com/jquery/jquery.git#2.1.4
bower jquery#>=1.6             install jquery#2.1.4

jquery#2.1.4 bower_components\jquery
```
