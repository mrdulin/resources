title: 使用$applyAsync，提升应用性能
date: 2014-2-17 17:44:47
tags:
- angular 
- 性能 
- JavaScript
- web
- 前端开发
categories: 
- angular

---


通过调用Angular 1.3增加的一个新的API——`$applyAsync`，可以使多个`$http`请求，达到在一个`$digest`循环中几乎同一时刻响应的目的。下面来具体解释下。

<!-- more -->

## 为什么、什么时候我们需要`$digest`循环

我们知道，数据和视图的双向绑定是Angular的一大特点。当js中数据变化时，我们可以看到html视图几乎是同时刷新，我们并没有设置一些监听事件或是做了其他操作来实现这一功能。

为了达到数据视图双向绑定的目的，Angular使用了事件循环（`$digest`循环）来更新我们的数据和视图。

Angular是怎么知道何时去触发`$digest`循环的呢？这里不过多讨论这个细节。但是需要说明的是，一些人认为，Angular通过毫秒级的检查数据，来判断数据是否变化，并去更新视图。__这是不正确的！__

首先说明数据可能发生变化，并且触发`$digest`循环的情况，基本上有以下3种情况：

* __用户通过事件与页面进行交互__ - 用户点击按钮，使我们应用程序的状态发生了改变。

* __XMLHttpRequests__ - 也被称为`AJAX`，我们的应用程序从服务器端请求回一些数据并更新了我们程序中的数据。

* __定时器__ - 通过定时器`$timeout`,`$interval`进行异步操作可能更改程序中的数据。

不论以上哪种情况发生，Angular这时会触发一次`$digest`循环。Angular会拦截到这些操作。怎么拦截？

这就是为什么我们要写一些Angular中预定义好的指令的缘故，比如`ng-click`，Angular重写的`input`指令等等。Angular也会在`$http`服务发送的请求返回时，触发一次`$digest`循环。

此外，这也解释了为什么当有其他Angular以外的代码（比如dom原生click事件，或是jquery提供的click事件）改变你应用程序的状态时，通过调用`$scope.$apply()`，可以立即触发一次`$digest`，从而更新视图。

到此，我们对`$digest`循环有个大体的了解。

## 在一次`$digest`循环中处理多个`$http`响应

如`$applyAsync`的名字，它会异步执行`$scope.$apply`。这是什么意思？在什么场景下使用呢？
例子：

```js
app.controller('Ctrl', function ($http) {
  $http.get('fetch/some/json/').then(function (response) {
    this.myModel = response.data;
  }.bind(this));
});
```

我们在controller中通过`$http`服务发送了一个请求，当请求resolve后，我们用请求回来的数据更新`myModel`。我们不需要进行DOM操作来更新视图。当请求resolve时，会触发一次`$digest`循环来更新视图。

现在我们在应用的启动阶段要发送3个请求。每个请求响应的时刻不同，因此会触发3次`$digest`循环，
会拖慢我们的应用。有没有办法我们可以收集这3个请求返回的promise，并且在下一次`$digest`循环中，将3个promise同时resolve？通过`$applyAsync`就可以实现。

只需要在应用的配置阶段，调用`$httpProvider`的`useApplyAsync`即可。

```js
app.config(function ($httpProvider) {
  $httpProvider.useApplyAsync(true);
});
```

加了这段代码后，如果应用程序现在接受到多个`$http`响应，会发生以下3点：

* 将请求的promise压入一个队列
* 异步的`$apply`准备执行，告诉浏览器去执行`setTimeout()`
* 当定时器执行完毕，清空promise队列，触发`$apply`

定时器`setTimeout()`时间被设置为0，不过在浏览器中可能有10毫秒的延迟。意味着，如果3个异步请求在同一时间响应，它们将在一次`$digest`循环中全部resolve，从而加快我们的应用程序。
