title: bower list
date: 2013-2-18 10:34:03
tags:
- bower
- 包管理工具
- web
- 前端开发
categories:
- bower

---

__bower list__

功能：列出本地安装的包，并检查是否有新版本。

<!-- more -->

命令：

```bat
bower list [<options>]
```

用法一：

```bat
bower list
bower check-new     Checking for new versions of the project dependencies..
jquery-plugins#0.0.0 e:\website\jquery-plugins
├── jquery#2.1.4
├─┬ jquery-ui#1.11.4
│ └── jquery#2.1.4
└── mockjs#0.1.9 (latest is 0.2.0-alpha1)
```

__说明：__虚线表示`jquery-plugins`这个项目依赖的包，此处依赖了`jquery#2.1.4`，`jquery-ui#1.11.4`和`mockjs#0.1.9`三个js库。其中，`jquery-ui#1.11.4`又依赖`jquery#2.1.4`。`mockjs`库检查出有新版本。

用法二：`-p`选项，生成一个简单的`json`格式的映射关系

```bat
bower list -p

'jquery-ui': 'bower_components/jquery-ui/jquery-ui.js',
jquery: 'bower_components/jquery/dist/jquery.js',
mockjs: 'bower_components/mockjs/dist/mock.js'
```

用法三：-r选项，暂无
