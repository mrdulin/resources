title: bower info
date: 2013-2-18 10:34:03
tags:
- bower
- 包管理工具
- web
- 前端开发
categories:
- bower

---

__bower info__

功能：查看包信息

<!-- more -->

用法一： 指定包名

<!-- more -->


```bat
dulin@IT01010030921 /e/website/jquery-plugins (master)
$ bower info jquery
bower jquery#*                  cached git://github.com/jquery/jquery.git#2.1.4
bower jquery#*                validate 2.1.4 against git://github.com/jquery/jquery.git#*

{
  name: 'jquery',
  version: '2.1.4',
  main: 'dist/jquery.js',
  license: 'MIT',
  ignore: [
    '**/.*',
    'build',
    'dist/cdn',
    'speed',
    'test',
    '*.md',
    'AUTHORS.txt',
    'Gruntfile.js',
    'package.json'
  ],
  devDependencies: {
    sizzle: '2.1.1-jquery.2.1.2',
    requirejs: '2.1.10',
    qunit: '1.14.0',
    sinon: '1.8.1'
  },
  keywords: [
    'jquery',
    'javascript',
    'library'
  ],
  homepage: 'https://github.com/jquery/jquery'
}

dulin@IT01010030921 /e/website/jquery-plugins (master)
$ - 2.1.4
  - 2.1.3
  - 2.1.2
  - 2.1.1
  - 2.1.1-rc2
  - 2.1.1-rc1
  - 2.1.1-beta1
  - 2.1.0
  - 2.1.0-rc1
  - 2.1.0-beta3
  - 2.1.0-beta2
  - 2.1.0-beta1
  - 2.0.3
  - 2.0.2
  - 2.0.1
  - 2.0.0
  - 2.0.0-beta3
  - 1.11.3
  - 1.11.2
  - 1.11.1
  - 1.11.1-rc2
  - 1.11.1-rc1
  - 1.11.1-beta1
  - 1.11.0
  - 1.11.0-rc1
  - 1.11.0-beta3
  - 1.11.0-beta2
  - 1.11.0-beta1
  - 1.10.2
  - 1.10.1
  - 1.10.0
  - 1.10.0-beta1
  - 1.9.1
  - 1.9.0
  - 1.8.3+1
  - 1.8.3
  - 1.8.2
  - 1.8.1
  - 1.8.0
  - 1.7.2
  - 1.7.1
  - 1.7.0
  - 1.6.4
  - 1.6.3
  - 1.6.2
  - 1.6.1
  - 1.6.0
  - 1.5.2
  - 1.5.1
  - 1.5.0
  - 1.4.4
  - 1.4.3
  - 1.4.2
  - 1.4.1
  - 1.4.0
  - 1.3.2
  - 1.3.1
  - 1.3.0
  - 1.2.6
  - 1.2.5
  - 1.2.4
  - 1.2.3
  - 1.2.2
  - 1.2.1
  - 1.1.4
  - 1.1.3
  - 1.1.2
  - 1.1.1
  - 1.0.4
  - 1.0.3
  - 1.0.2
  - 1.0.1
You can request info for a specific version with 'bower info jquery#<version>'
```

__说明:__列出了包的`bower.json`文件信息，和该包所有的版本号。

用法二：指定包名和版本号

```bat
dulin@IT01010030921 /e/website/jquery-plugins (master)
$ bower info jquery#2.1.4
bower jquery#2.1.4              cached git://github.com/jquery/jquery.git#2.1.4
bower jquery#2.1.4            validate 2.1.4 against git://github.com/jquery/jquery.git#2.1.4

{
  name: 'jquery',
  version: '2.1.4',
  main: 'dist/jquery.js',
  license: 'MIT',
  ignore: [
    '**/.*',
    'build',
    'dist/cdn',
    'speed',
    'test',
    '*.md',
    'AUTHORS.txt',
    'Gruntfile.js',
    'package.json'
  ],
  devDependencies: {
    sizzle: '2.1.1-jquery.2.1.2',
    requirejs: '2.1.10',
    qunit: '1.14.0',
    sinon: '1.8.1'
  },
  keywords: [
    'jquery',
    'javascript',
    'library'
  ],
  homepage: 'https://github.com/jquery/jquery'
}
```

__说明:__列出指定版本号的包的`bower.json`文件信息。
