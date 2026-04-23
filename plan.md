# NetViz 项目规划与进度文档

## 项目概述

**项目名称**: NetViz - 网络工程可视化平台

**项目定位**: 类似 Simulab (https://wqnmd.com/) 的网络协议可视化教学平台

**目标用户**: 学习计算机网络的中国学生

**部署方案**: Vercel 免费部署，无需购买服务器

---

## 项目蓝图

### 核心功能

1. **网络协议动画演示**
   - 使用 Canvas API 实现动态动画
   - 展示报文交互过程（带拖尾效果）
   - 报文结构可视化
   - 支持步骤式学习（逐步推进）

2. **OSI 七层模型分类**
   - 应用层 (Application Layer)
   - 网络层 (Network Layer)
   - 路由协议 (Routing Protocols)
   - 可用性协议 (Availability Protocols)

3. **视觉设计**
   - 蓝白配色方案
   - 暗色/亮色模式切换
   - 卡片式布局
   - 按钮式导航栏（带悬停浮动效果）
   - 固定 Logo（左上角，不随页面缩放）

4. **用户体验**
   - 所有页面使用中文（括号内标注英文）
   - 子页面带"返回主页"按钮
   - 步骤进度控制
   - 报文日志显示
   - 连接状态显示

---

## 技术栈

- **框架**: Next.js 14 + TypeScript
- **样式**: Tailwind CSS
- **动画**: Canvas API (requestAnimationFrame)
- **组件**: React Client Components (use client)
- **部署**: Vercel
- **版本控制**: Git + GitHub

---

## 已完成的协议页面

### ✅ 1. TCP 页面 (已完成)

**文件**: `app/protocol/tcp/page.tsx`

**功能特性**:
- ✅ 客户端（显示器图标）+ 服务端（服务器图标）区分
- ✅ 三次握手动画（SYN → SYN-ACK → ACK）
- ✅ 顶部完整流程文字介绍
- ✅ 动态状态显示（CLOSED → LISTEN → SYN_SENT → SYN_RCVD → ESTABLISHED）
- ✅ 报文日志（中文显示）
- ✅ 连接状态面板
- ✅ 步骤控制（5 个步骤）
- ✅ 暗色/亮色模式支持

**动画细节**:
- 圆形报文 + 光晕效果
- 渐变球体
- 拖尾箭头
- 旋转动画
- 脉冲光晕

---

### ✅ 2. HTTP 页面 (已完成)

**文件**: `app/protocol/http/page.tsx`

**功能特性**:
- ✅ TCP 三次握手时序图（在一个步骤内完整展示）
- ✅ 客户端（显示器图标）+ 服务器（圆柱体图标）
- ✅ 灰色虚线路径预显示（完整轨迹）
- ✅ 彩色虚线拖尾（跟随球球）
- ✅ 球球中间显示报文类型（SYN/SYN+ACK/ACK）
- ✅ 球球旁边显示序列号（seq/ack）
- ✅ 客户端/服务器标签颜色适配（暗色/亮色模式）
- ✅ HTTP 请求响应过程动画（GET → 200 OK）
- ✅ 顶部完整流程文字介绍（4 个步骤详细说明）
- ✅ 连接状态显示
- ✅ 报文日志（中文）

**动画细节**:
- 垂直虚线时间线
- 完整路径灰色虚线（半透明）
- 球球运动轨迹虚线 `[8, 6]`
- 文字背景框（防止遮挡）
- 光晕脉冲效果

---

### ✅ 3. 主页 (已完成)

**文件**: `app/page.tsx`

**功能特性**:
- ✅ 固定 Logo（左上角，position: fixed）
- ✅ 按钮式导航栏（OSI 七层模型、路由协议、可用性协议）
- ✅ 导航按钮悬停效果（背景变蓝、文字变白、向上浮动）
- ✅ OSI 七层模型下拉菜单（悬停自动展开/收起）
- ✅ 协议卡片网格布局（一排 3 个）
- ✅ 卡片悬停上浮效果
- ✅ 暗色/亮色模式切换
- ✅ 开始探索按钮

**导航结构**:
```
Logo: NetViz - 网络工程可视化
├── OSI 七层模型 (下拉菜单)
│   ├── 应用层
│   ├── 网络层
│   ├── 路由协议
│   └── 可用性协议
├── 路由协议
└── 可用性协议
```

---

### ✅ 4. 分类页面 (已完成)

**文件**: `app/category/[category]/page.tsx`

**功能特性**:
- ✅ 动态路由支持（application/network/routing/availability）
- ✅ 显示该分类下的所有协议
- ✅ 卡片网格布局（一排 3 个）
- ✅ 卡片悬停效果
- ✅ 返回主页按钮

**配置文件**: `lib/categories.ts`

**分类定义**:
```typescript
- application: HTTP, DNS
- network: TCP, IP, ARP, ICMP
- routing: OSPF, BGP, RIP
- availability: VRRP, STP, MSTP
```

---

### ✅ 5. Emoji 组件 (已完成)

**文件**: `components/Emoji.tsx`

**功能特性**:
- ✅ 解决 emoji 编码问题
- ✅ 统一 emoji 显示样式
- ✅ 支持所有页面使用 emoji

---

### ✅ 6. 导航栏 UI (已完成)

**功能特性**:
- ✅ 按钮样式（px-4 py-2 rounded-lg）
- ✅ 悬停浮动效果
- ✅ 自动展开/收起（OSI 七层模型）
- ✅ 响应式设计

---

## 待完成的协议页面

### ⏳ 待更新列表（共 10 个）

以下页面需要按照 TCP/HTTP 页面的标准进行更新：

1. **DNS 页面** (`app/protocol/dns/page.tsx`)
   - 需要添加：客户端/服务端图标区分
   - 需要添加：DNS 查询过程动画
   - 需要添加：流程介绍文字
   - 需要添加：动态状态显示

2. **IP 页面** (`app/protocol/ip/page.tsx`)
   - 需要添加：发送端/接收端图标
   - 需要添加：IP 数据包转发动画
   - 需要添加：路由选择过程
   - 需要添加：IP 头部结构展示

3. **ARP 页面** (`app/protocol/arp/page.tsx`)
   - 需要添加：广播/单播动画
   - 需要添加：ARP 请求/响应过程
   - 需要添加：MAC 地址解析动画

4. **ICMP 页面** (`app/protocol/icmp/page.tsx`)
   - 需要添加：Ping 命令动画
   - 需要添加：ICMP 请求/响应
   - 需要添加：错误报告机制

5. **OSPF 页面** (`app/protocol/ospf/page.tsx`)
   - 需要添加：路由器图标
   - 需要添加：LSA 泛洪动画
   - 需要添加：SPF 算法可视化
   - 需要添加：邻居发现过程

6. **BGP 页面** (`app/protocol/bgp/page.tsx`)
   - 需要添加：AS（自治系统）可视化
   - 需要添加：BGP 会话建立
   - 需要添加：路由更新动画
   - 需要添加：路径选择过程

7. **RIP 页面** (`app/protocol/rip/page.tsx`)
   - 需要添加：距离向量动画
   - 需要添加：路由表更新
   - 需要添加：跳数计算展示

8. **VRRP 页面** (`app/protocol/vrrp/page.tsx`)
   - 需要添加：主备路由器切换
   - 需要添加：虚拟 IP 动画
   - 需要添加：优先级选举过程

9. **STP 页面** (`app/protocol/stp/page.tsx`)
   - 需要添加：交换机图标
   - 需要添加：生成树构建过程
   - 需要添加：根桥选举
   - 需要添加：端口状态转换

10. **MSTP 页面** (`app/protocol/mstp/page.tsx`)
    - 需要添加：多实例可视化
    - 需要添加：VLAN 映射
    - 需要添加：实例间负载均衡

---

## 统一设计标准

所有协议页面应遵循以下标准：

### UI 设计
- ✅ 蓝白配色方案
- ✅ 卡片式布局（rounded-xl border）
- ✅ 按钮式导航（带悬停效果）
- ✅ 固定 Logo（左上角）
- ✅ 返回主页按钮

### 动画效果
- ✅ 圆形报文 + 光晕
- ✅ 渐变球体
- ✅ 拖尾效果（虚线或实线）
- ✅ 旋转动画
- ✅ 脉冲光晕
- ✅ 路径预显示（灰色虚线）

### 内容结构
- ✅ 顶部完整流程文字介绍
- ✅ 步骤式动画控制
- ✅ 动态状态显示
- ✅ 报文日志（中文）
- ✅ 连接状态面板
- ✅ 图例说明

### 技术实现
- ✅ 使用 Canvas API
- ✅ requestAnimationFrame 动画
- ✅ TypeScript 类型安全
- ✅ 暗色/亮色模式支持
- ✅ 响应式设计

---

## 开发规范

### 代码风格
- 使用 TypeScript
- 组件使用函数式写法
- 状态管理使用 React Hooks
- Canvas 动画使用 useRef 保存引用

### 命名规范
- 文件名：小写 + 连字符（如 `page.tsx`）
- 组件名：大驼峰（如 `HTTPPage`）
- 变量名：小驼峰（如 `currentStep`）
- 常量名：全大写（如 `PACKET_COLORS`）

### 注释规范
- 关键代码段添加中文注释
- 复杂算法添加详细说明
- 不使用 emoji（使用 Emoji 组件）

---

## 后续开发计划

### 第一阶段：完成所有协议页面（优先级：高）

**目标**: 将剩余 10 个协议页面全部按照 TCP/HTTP 的标准更新

**预计工作量**: 每个页面约 2-3 小时

**优先级排序**:
1. DNS（应用层核心协议）
2. IP（网络层核心协议）
3. ARP（网络层重要协议）
4. ICMP（网络层诊断协议）
5. OSPF（路由协议核心）
6. BGP（路由协议核心）
7. STP（可用性协议核心）
8. MSTP（STP 增强版）
9. VRRP（可用性协议）
10. RIP（传统路由协议）

### 第二阶段：优化与增强（优先级：中）

**功能增强**:
- [ ] 添加协议对比功能
- [ ] 添加测验/练习模式
- [ ] 添加笔记功能
- [ ] 添加收藏功能
- [ ] 添加搜索功能

**性能优化**:
- [ ] Canvas 渲染优化
- [ ] 动画帧率优化
- [ ] 代码分割（Code Splitting）
- [ ] 图片懒加载

**SEO 优化**:
- [ ] 添加 meta 标签
- [ ] 添加 Open Graph 标签
- [ ] 生成 sitemap.xml
- [ ] 优化页面加载速度

### 第三阶段：扩展功能（优先级：低）

**新功能**:
- [ ] 用户自定义拓扑图
- [ ] 协议组合演示（如 HTTP over TCP over IP）
- [ ] 3D 可视化模式
- [ ] VR/AR 支持
- [ ] 多语言支持（英文、日文等）

**数据可视化**:
- [ ] 网络流量统计
- [ ] 协议使用分析
- [ ] 用户学习进度追踪

---

## 技术债务

### 已知问题
- [ ] Canvas 动画在低性能设备上可能卡顿
- [ ] 某些 emoji 在某些设备上显示不一致
- [ ] 暗色模式切换时可能有闪烁

### 待优化
- [ ] 代码复用（提取公共组件）
- [ ] 动画配置参数化
- [ ] 样式统一管理（使用 CSS Variables）
- [ ] 添加单元测试
- [ ] 添加 E2E 测试

---

## 项目里程碑

### ✅ 已完成
- [x] 项目初始化（Next.js + TypeScript + Tailwind）
- [x] 主页开发（导航栏 + 协议卡片）
- [x] 分类页面开发（动态路由）
- [x] TCP 页面开发（三次握手动画）
- [x] HTTP 页面开发（时序图动画）
- [x] Emoji 组件开发
- [x] 导航栏 UI 优化
- [x] 暗色/亮色模式
- [x] GitHub 仓库连接

### 🎯 短期目标（1-2 周）
- [ ] 完成 DNS、IP、ARP 页面
- [ ] 完成 ICMP、OSPF 页面
- [ ] 添加更多协议动画细节
- [ ] 优化移动端体验

### 🎯 中期目标（1 个月）
- [ ] 完成所有 12 个协议页面
- [ ] 添加用户反馈功能
- [ ] 优化性能和 SEO
- [ ] 部署到 Vercel 生产环境

### 🎯 长期目标（3 个月）
- [ ] 添加用户系统
- [ ] 添加自定义拓扑图
- [ ] 添加测验模式
- [ ] 推广到学校和培训机构

---

## 参考资源

### 设计参考
- Simulab: https://wqnmd.com/
- Tailwind UI: https://tailwindui.com/
- Canvas API 文档: https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API

### 技术文档
- Next.js 文档: https://nextjs.org/docs
- TypeScript 文档: https://www.typescriptlang.org/docs/
- Vercel 部署: https://vercel.com/docs

### 网络协议参考
- RFC 文档: https://www.rfc-editor.org/
- 计算机网络教材（谢希仁版）
- Wireshark 抓包分析

---

## 项目统计

### 文件统计
- 总文件数: 12+ 个协议页面
- 已完成: 2 个（TCP, HTTP）
- 待完成: 10 个

### 代码统计
- 总代码行数: 约 3000+ 行
- Canvas 动画代码: 约 1500+ 行
- UI 组件代码: 约 1000+ 行
- 配置文件: 约 500+ 行

### 协议覆盖
- OSI 应用层: 2/10 (HTTP, DNS)
- OSI 网络层: 1/10 (TCP, IP, ARP, ICMP)
- 路由协议: 0/10 (OSPF, BGP, RIP)
- 可用性协议: 0/10 (VRRP, STP, MSTP)

---

## 联系与反馈

**GitHub 仓库**: https://github.com/BDTA-zky/netviz

**问题反馈**: 请在 GitHub Issues 中提交

**贡献指南**: 欢迎提交 Pull Request

---

**最后更新时间**: 2026-04-23

**文档版本**: v1.0
