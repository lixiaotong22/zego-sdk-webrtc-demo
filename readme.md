## 集成即构的Express-SDK

[Express-SDK 官网文档](https://doc-zh.zego.im/zh/693.html)

web的底层库是基于webrtc实现的

#### 运行指南：

```
//安装依赖包
npm i

//编译打包项目
npm run build

//使用webpack-dev 运行web项目，默认使用：8080端口
npm run dev

```

#### demo文件目录

```
|-- zego-sdk-webrtc-demo
    |-- .babelrc
    |-- .gitignore
    |-- cert.pem
    |-- key.pem
    |-- package.json
    |-- readme.md
    |-- webpack.config.js
    |-- dist
    |-- src
        |-- common.js
        |-- index.html
        |-- index.js 
        |-- assets
```
JS源代码在src/index.js 和 src/common.js

注：只能从主播端发起 连麦 请求。需两人连麦后 才能发起 混流 请求，观众端没有拉取 混流。目前只做了两个人的 连麦功能