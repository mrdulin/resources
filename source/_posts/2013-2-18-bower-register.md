title: bower register
date: 2013-2-18 10:34:03
tags:
- bower
- 包管理工具
- web
- 前端开发
categories:
- bower

---

__bower register__

功能：在线上注册包，别人就能通过bower来下载你的包了。

<!-- more -->

用法： `bower register <name> <url>`

name是你的包名

url是你的包的地址(几种有效地址见`bower install`)

要注册一个包，需要满足以下条件：

* 包名必须和`bower.json`文件中的name字段的值相同。
* 必须有一个合法的`bower.json`文件在你的项目根目录下。
* 你的包需要有一个符合[语义化版本](http://semver.org/lang/zh-CN/)的git tag标签。允许使用前缀`v`。
* 你的包必须是公开的，是可访问的地址（例如:Github），别忘记push你的git tag标签。
* 对于私有包(例如：Github Enterprise)，考虑使用[bower registry](https://github.com/bower/registry)。

使用`bower register`:
```cmd
bower register <my-package-name> <git-endpoint>
例：
bower register example git://github.com/user/example.git
```

注册后，所有人都可以通过运行`bower install <my-package-name>`获得你发布的包。

Bower不支持类似Github风格的命名（如：`org/repo`），推荐使用连字符`-`来命名，例如，`angular-`和`paper-`。

下面以本仓库为例来实践以下：

```cmd
E:\bk\webpack>bower register learn_bower https://github.com/Sspeed5cm/learn_bower.git
bower learn_bower#*            resolve https://github.com/Sspeed5cm/learn_bower.git#*
bower learn_bower#*           checkout master
bower learn_bower#*       invalid-meta learn-bower is missing "main" entry in bower.json
bower learn_bower#*           resolved https://github.com/Sspeed5cm/learn_bower.git#0119ec5944
? Registering a package will make it installable via the registry (https://bower.herokuapp.com), continue? Yes
bower learn_bower             register https://github.com/Sspeed5cm/learn_bower.git
bower                       EDUPLICATE Duplicate package
```

出错了，最后提示`Duplicate package`说明，这个包名应该已经被注册过了，查看一下，看线上是否已经有这个名字的包：

```cmd
E:\bk\webpack>bower lookup learn_bower
learn_bower git://github.com/striver-x/learn_bower.git
```

果然有，因此我们需要换下包名:

```cmd
E:\bk\webpack>bower register learn-bower https://github.com/Sspeed5cm/learn_bower.git --verbose
bower learn-bower#*            resolve https://github.com/Sspeed5cm/learn_bower.git#*
bower learn-bower#*           checkout master
bower learn-bower#*       invalid-meta learn-bower is missing "main" entry in bower.json
bower learn-bower#*           resolved https://github.com/Sspeed5cm/learn_bower.git#0119ec5944
? Registering a package will make it installable via the registry (https://bower.herokuapp.com), continue? Yes
bower learn-bower             register https://github.com/Sspeed5cm/learn_bower.git

Package learn-bower registered successfully!
All valid semver tags on https://github.com/Sspeed5cm/learn_bower.git will be available as versions.
To publish a new version, just release a valid semver tag.

Run bower info learn-bower to list the available versions.
```

注册成功！提示说可以运行`bower info learn-bower`来列出所有可用的版本，试试：

```cmd
E:\bk\webpack>bower info learn-bower
bower learn-bower#*         not-cached git://github.com/Sspeed5cm/learn_bower.git#*
bower learn-bower#*            resolve git://github.com/Sspeed5cm/learn_bower.git#*
bower learn-bower#*           checkout master
bower learn-bower#*       invalid-meta learn-bower is missing "main" entry in bower.json
bower learn-bower#*           resolved git://github.com/Sspeed5cm/learn_bower.git#0119ec5944

{
  name: 'learn-bower',
  authors: [
    'dulin <novaline@qq.com>'
  ],
  description: '',
  main: '',
  moduleType: [],
  license: 'MIT',
  homepage: 'https://github.com/Sspeed5cm/learn_bower',
  ignore: [
    '**/.*',
    'node_modules',
    'bower_components',
    'test',
    'tests'
  ]
}

No versions available.
```

再使用`bower lookup`确认我们的包已经注册成功：

```cmd
E:\bk\webpack>bower lookup learn-bower
learn-bower git://github.com/Sspeed5cm/learn_bower.git
```

能找到，没问题。
