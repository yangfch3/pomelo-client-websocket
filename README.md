# Pomelo Client
本库是对官方 Pomelo JavaScript 客户端的改进。

## Features
1. 可以同时在浏览器或 Node 环境中使用
2. 支持创建多个 Pomelo 客户端实例
3. 客户端实例新增 `__CLIENT_ROUTE` `__CLIENT_RESPONSE` 事件用于对所有服务器端推送、响应消息进行统一处理；新增连接成功 `connect` 事件
4. `wss` 协议支持
5. 实例新增 `initByUrl(url, params, cb)` 方法
6. 兼容 `\uffff` 以上字符
7. 支持重连（>= 1.0.5）

## Usage
在浏览器和 Node 环境下运行时对本库的使用存在细微的差别。

### Node
```
npm i pomelo-client-websocket --save
```
```javascript
const Pomelo = require('pomelo-client-websocket');
const pomelo = new Pomelo();

pomelo.init({
    host: '192.168.1.20',
    port: 3010,
    scheme: 'ws',

    log: true, // 开启日志输出

    // 重连相关配置
    // reconnect: true,
    // reconnectDelay: 3000,
    // maxReconnectAttempts: 3
}, () => {
    pomelo.request('gate.gateHandler.queryEntry', {
        uid: 234234232
    }, (data) => {
        console.log(data);
        pomelo.disconnect();
        if(data.code === 500) {
            console.error('gate 连接失败');
            return;
        }
        pomelo.init({
            host: data.hosts,
            port: data.port,
            scheme: 'wss'
        }, () => {
            // ...
        });
    });
});

pomelo.on('loginRes', (data) => {
    console.log(data);
});

// Feature: 对所有服务端推送消息的统一处理
pomelo.on('__CLIENT_ROUTE', (route, data) => {
    console.log(route);
    console.log(data);
});
```

### Browser

如果您使用 `webpack` 等打包工具，并且打包后的代码是在浏览器环境下运行，则使用下面的方法引入：
```javascript
const Pomelo = require('pomelo-client-websocket/core');
const pomelo = new Pomelo();

// ...
```

换句话说：`pomelo-client-websocket/core.js` 可以直接在浏览器下运行

