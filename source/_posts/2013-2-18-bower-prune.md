title: bower prune
date: 2013-2-18 10:34:03
tags:
- bower
- 包管理工具
- web
- 前端开发
categories:
- bower

---

__bower prune__

功能：删除不在bower.json的dependencies中的包

<!-- more -->

用法：

```cmd
E:\bk\webpack>bower prune -h

Usage:

    bower prune [<options>]
Options:

    -h, --help              Show this help message
    Additionally all global options listed in 'bower help' are available

Description:

    Uninstalls local extraneous packages.
```

假设我们的bower.json文件如下：

```js
{
  "name": "webpack",
  "authors": [
    "dulin <novaline@qq.com>"
  ],
  "description": "",
  "main": "",
  "moduleType": [],
  "license": "MIT",
  "homepage": "",
  "ignore": [
    "**/.*",
    "node_modules",
    "bower_components",
    "test",
    "tests"
  ],
  "dependencies": {
    "jquery": "~2.1.4",
    "underscore": "~1.8.3"
  }
}
```

安装了两个包(jquery和underscore)在bower_components目录下，这时候我们要删除underscore这个包。

首先，删除bower.json文件dependencies字段下的underscore包，删除后如下：

```js
{
  "name": "webpack",
  "authors": [
    "dulin <novaline@qq.com>"
  ],
  "description": "",
  "main": "",
  "moduleType": [],
  "license": "MIT",
  "homepage": "",
  "ignore": [
    "**/.*",
    "node_modules",
    "bower_components",
    "test",
    "tests"
  ],
  "dependencies": {
    "jquery": "~2.1.4"
  }
}
```

然后，运行:

```cmd
E:\bk\webpack>bower prune
bower uninstall     underscore
```

即删除了underscore包，可以查看bower_components目录下，已经没有了underscore这个包。

如果需要卸载大量的包，通过这种方式比通过`bower uninstall`这种方式要方便快速。
