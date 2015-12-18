title: controllerAs和scope
date: 2014-2-18 11:57:39
tags:
- angular
- controllerAs
- scope
- 作用域
categories: 
- angular

---

先来看个例子

<!-- more -->

```js
var obj1 = {  
  someProp: 'obj1 property!',
  someMethod: function () {
    alert('obj1 method!');
  }
};
var obj2 = Object.create(obj1);  
obj2.someProp = 'obj2 property!';  
```

我们修改obj2的someProp属性的值，你可能会觉得obj1的`someProp`属性的值也会被更改为"obj2 property!"。实际上，你并不能这样改变一个对象的原型的属性。这里的操作只是在`obj2`对象上创建了一个叫做`someProp`的属性，这个属性”遮盖“了`obj1`的`someProp`属性。如果你运行`delete obj2.someProp`，会发现obj1上的`someProp`属性并不会被删除。此时，`obj2.someProp`属性的值为`obj1.someProp`属性的值。

以上就是嵌套作用域scope对象的工作原理。就是说，在一个子作用域scope对象上添加一个属性，不会改变父作用域scope对象上的同名属性的值，而是将其”遮盖“。

具体例子[这里](https://github.com/Sspeed5cm/learn_angular/blob/master/examples/Angular%20controller%20as%20%E5%92%8C%20%24scope.html)
