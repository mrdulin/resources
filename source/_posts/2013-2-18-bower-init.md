title: bower init
date: 2013-2-18 10:34:03
tags:
- bower
- 包管理工具
- web
- 前端开发
categories:
- bower

---

__bower init__

功能：在命令行中交互式的创建bower.json文件。

<!-- more -->

```cmd
E:\bk\webpack>bower init
? name webpack
? description
? main file
? what types of modules does this package expose?
? keywords
? authors dulin <novaline@qq.com>
? license MIT
? homepage
? set currently installed components as dependencies? Yes
? add commonly ignored files to ignore list? Yes
? would you like to mark this package as private which prevents it from being accidentally published to the registry? No

{
  name: 'webpack',
  authors: [
    'dulin <novaline@qq.com>'
  ],
  description: '',
  main: '',
  moduleType: [],
  license: 'MIT',
  homepage: '',
  ignore: [
    '**/.*',
    'node_modules',
    'bower_components',
    'test',
    'tests'
  ]
}

? Looks good? Yes

E:\bk\webpack>
```
