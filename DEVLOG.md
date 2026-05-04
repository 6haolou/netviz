# NetViz 开发日志

## 缘起

看到 [wqnmd.com](https://wqnmd.com/) 这个个人开发者用 vibe coding 做的网站，作为网络工程师就想自己也做一个网络工程可视化平台，于是开始了 NetViz 项目。

## 工具变迁

### 第一阶段：Trae Solo + Doubao
一开始用 Trae Solo，默认的 Doubao 模型。速度慢，正确率低，改一个小功能要等很久，还经常改不对。

### 第二阶段：Trae Solo + Qianwen
发现可以换模型，改成 Qianwen 后有识图功能，沟通更好了，识别也更准。但一些基础功能改起来仍然费劲，比如：
- 黑白主题切换——反复改了很多次都不对
- OSPF 页面铺满整行——很长时间搞不定

### 第三阶段：Trae + DeepSeek V4
DeepSeek V4 出来后 Trae 接入，用 v4-flash 模型，速度仍然很慢。

### 第四阶段：Claude Code + DeepSeek V4（当前）
学到可以用 Claude Code Desktop 接入 DeepSeek V4 模型，开始用 CC 开发。效果比之前好很多，速度快，改得准。目前所有页面都是用 CC 重写和优化的。

## 当前状态

### 页面（12 个协议 + 主页 + 分类页）
- 传输层：TCP
- 应用层：HTTP、DNS
- 网络层：IP、ARP、ICMP
- 路由协议：OSPF、BGP、RIP
- 高可用性：VRRP、STP、MSTP

### 已实现功能
- Canvas API 动画展示协议交互过程
- 步骤式控制（逐步/跳步/重置）
- 报文交互日志
- 协议首部图解
- 暗色/亮色模式切换
- 分类导航
- PC → Switch → Router → Internet → Server 主页拓扑动画

### 后续计划
- 更多协议支持
- 交互式参数配置
- 性能优化
- 更多可视化效果

## 仓库

https://github.com/BDTA-zky/netviz
