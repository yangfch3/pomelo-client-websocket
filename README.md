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

// 建议每个连接使用不同的实例，避免单实例先后多次连接
const gatePomelo = new Pomelo();
const connectorPomelo = new Pomelo();

gatePomelo.init({
    host: '192.168.1.20',
    port: 3010,
    scheme: 'ws',

    log: true, // 开启日志输出

    // 重连相关配置
    // reconnect: true,
    // reconnectDelay: 3000,
    // maxReconnectAttempts: 3
}, () => {
    gatePomelo.request('gate.gateHandler.queryEntry', {
        uid: 234234232
    }, (data) => {
        console.log(data);
        gatePomelo.disconnect();
        if(data.code === 500) {
            console.error('gate 连接失败');
            return;
        }
        connectorPomelo.init({
            host: data.hosts,
            port: data.port,
            scheme: 'wss',
            
            reconnect: true,
            maxReconnectAttempts: 5, // 最大重连尝试次数
            reconnectionDelay: 2000 // 重连的 delay 时间
        }, () => {
            // ...
        });
    });
});

connectorPomelo.on('loginRes', (data) => {
    console.log(data);
});

// Feature: 对所有服务端推送消息的统一处理
connectorPomelo.on('__CLIENT_ROUTE', (route, data) => {
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

### 微信小程序支持
见 [pomelo-client-wx](https://github.com/yangfch3/pomelo-client-wx)，`pomelo-client-wx` 同时兼容微信小程序和 Web，方便 H5 游戏开发时 Web 和小程序环境的无痛兼容

