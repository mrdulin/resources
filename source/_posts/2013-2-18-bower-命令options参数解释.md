title: bower命令options参数解释
date: 2013-2-18 10:34:03
tags:
- bower
- 包管理工具
- web
- 前端开发
categories:
- bower

---


__force__

```cmd
-f, --force
```
强制执行命令

__json__

```cmd
-j, --json
```
将输出格式化为JSON格式。

<!-- more -->

例1:

```cmd
E:\bk\webpack>bower lookup jquery -j
{
  "name": "jquery",
  "url": "git://github.com/jquery/jquery.git"
}
```

例2:
```cmd
E:\bk\webpack>bower install jquery --save --json
[{
  "level": "info",
  "id": "cached",
  "message": "git://github.com/jquery/jquery.git#2.1.4",
  "data": {
    "endpoint": {
      "name": "",
      "source": "jquery",
      "target": "*"
    },
  ...
  ...
}]
```

__log-level__

```cmd
-l, --log-level
```
bower日志级别

__offline__

```cmd
-o, -offline
```
离线模式。

例1:
```cmd
E:\bk\webpack>bower install jquery-ui --save -o
bower                        ENOTFOUND Package jquery-ui not found
```
离线模式，bower会先从本地缓存中找该包，如果本地没有，又无法使用网络去找线上的包，就会提示jquery-ui包找不到。

例2:
```cmd
E:\bk\webpack>bower install jquery-ui --save
bower                            retry Request to https://bower.herokuapp.com/packages/jquery-ui failed with ETIMEDOUT, retrying in 1.3s
bower                            retry Request to https://bower.herokuapp.com/packages/jquery-ui failed with ETIMEDOUT, retrying in 2.7s
bower jquery-ui#*           not-cached git://github.com/components/jqueryui.git#*
bower jquery-ui#*              resolve git://github.com/components/jqueryui.git#*
bower jquery-ui#*             download https://github.com/components/jqueryui/archive/1.11.4.tar.gz
bower jquery-ui#*              extract archive.tar.gz
bower jquery-ui#*             resolved git://github.com/components/jqueryui.git#1.11.4
bower jquery-ui#~1.11.4        install jquery-ui#1.11.4

jquery-ui#1.11.4 bower_components\jquery-ui
└── jquery#2.1.4
```
使用网络，bower从线上下载jquery-ui。

例3:

```cmd
E:\bk\webpack>bower install angular --save -o
bower angular#*                 cached git://github.com/angular/bower-angular.git#1.4.8
bower angular#~1.4.8           install angular#1.4.8

angular#1.4.8 bower_components\angular
```
在本地缓存中已经有angular的包，可以使用离线模式再次安装angular。

__quiet__

```cmd
-q, --quiet
```
只输出重要信息。

例1:
```cmd
E:\bk\webpack>bower lookup jquery --quiet
```
什么都输出。

例2:

```cmd
E:\bk\webpack>bower install backbone --save -q
```
安装backbone（不管从缓存中，还是第一次从网络上下载），都没有提示信息。

__silent__

```cmd
-s, --slient
```
不输出除了错误以外的任何信息。

例1:
```cmd
E:\bk\webpack>bower install --save -s
```

例2:
```cmd
E:\bk\webpack>bower install e -s
bower                        ENOTFOUND Package e not found
```
要安装的包e不存在，输出错误提示信息。

__verbose__

```cmd
-V, --verbose
```
输出详细信息。

例1:
```cmd
E:\bk\webpack>bower install e -V
bower                        ENOTFOUND Package e not found

Stack trace:
Error: Package e not found
    at createError (C:\Program Files\nodejs\node_modules\bower\lib\util\createError.js:4:15)
    at C:\Program Files\nodejs\node_modules\bower\lib\core\resolverFactory.js:194:23
    at _fulfilled (C:\Program Files\nodejs\node_modules\bower\node_modules\q\q.js:834:54)
    at self.promiseDispatch.done (C:\Program Files\nodejs\node_modules\bower\node_modules\q\q.js:863:30)
    at Promise.promise.promiseDispatch (C:\Program Files\nodejs\node_modules\bower\node_modules\q\q.js:796:13)
    at C:\Program Files\nodejs\node_modules\bower\node_modules\q\q.js:604:44
    at runSingle (C:\Program Files\nodejs\node_modules\bower\node_modules\q\q.js:137:13)
    at flush (C:\Program Files\nodejs\node_modules\bower\node_modules\q\q.js:125:13)
From previous event:
    at defer (C:\Program Files\nodejs\node_modules\bower\node_modules\q\q.js:582:19)
    at Promise.then (C:\Program Files\nodejs\node_modules\bower\node_modules\q\q.js:828:20)
    at PackageRepository.fetch (C:\Program Files\nodejs\node_modules\bower\lib\core\PackageRepository.js:44:6)
    at Manager._fetch (C:\Program Files\nodejs\node_modules\bower\lib\core\Manager.js:322:51)
    at Array.forEach (native)
    at Manager.resolve (C:\Program Files\nodejs\node_modules\bower\lib\core\Manager.js:115:23)
    at Project._bootstrap (C:\Program Files\nodejs\node_modules\bower\lib\core\Project.js:543:6)
    at C:\Program Files\nodejs\node_modules\bower\lib\core\Project.js:74:21
    at C:\Program Files\nodejs\node_modules\bower\node_modules\q\q.js:1229:26
    at _fulfilled (C:\Program Files\nodejs\node_modules\bower\node_modules\q\q.js:834:54)

Console trace:
Error
    at StandardRenderer.error (C:\Program Files\nodejs\node_modules\bower\lib\renderers\StandardRenderer.js:82:37)
    at Logger.<anonymous> (C:\Program Files\nodejs\node_modules\bower\bin\bower:110:22)
    at Logger.emit (events.js:107:17)
    at Logger.emit (C:\Program Files\nodejs\node_modules\bower\node_modules\bower-logger\lib\Logger.js:29:39)
    at C:\Program Files\nodejs\node_modules\bower\lib\commands\index.js:48:20
    at _rejected (C:\Program Files\nodejs\node_modules\bower\node_modules\q\q.js:844:24)
    at C:\Program Files\nodejs\node_modules\bower\node_modules\q\q.js:870:30
    at Promise.when (C:\Program Files\nodejs\node_modules\bower\node_modules\q\q.js:1122:31)
    at Promise.promise.promiseDispatch (C:\Program Files\nodejs\node_modules\bower\node_modules\q\q.js:788:41)
    at C:\Program Files\nodejs\node_modules\bower\node_modules\q\q.js:604:44
System info:
Bower version: 1.6.5
Node version: 0.12.7
OS: Windows_NT 6.1.7601 x64
```
安装的包e不存在，输出了详细的错误堆栈。
