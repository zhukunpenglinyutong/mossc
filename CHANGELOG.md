# Changelog

##### **2026年3月10日（v0.0.1）**

English:

✨ Features

- Initial project scaffold based on Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui 4: full-stack architecture with App Router, server-side rendering, and edge-ready API routes
- Integrate OpenClaw engine as backend runtime: WebSocket-based gateway adapter with auto-reconnect, method allowlisting, heartbeat monitoring, and request/response correlation
- Chat system with real-time streaming: 1-on-1 conversations with AI agents, SSE-based token streaming, typing indicators, message history loading, and session reset
- Group chat with multi-agent orchestration: create groups with multiple AI agents, support four collaboration strategies — All Respond, Smart Match (skill-based routing), Coordinator (delegated assignment), and Round Robin (turn-based)
- Virtual Team office view: pixel-art 2D office visualization showing agent status (idle/working/busy), interactive desk areas, whiteboard, and coffee machine decorations
- Agent lifecycle management: create, rename, delete agents via OpenClaw gateway; custom avatar upload with file picker and built-in avatar gallery; agent profile cards with skill tags and status indicators
- Scheduled Jobs (Cron) system: create, edit, run, pause, and delete cron jobs; cron expression builder UI; run history timeline with status tracking; real-time cron daemon status display
- Model provider configuration: multi-provider setup (OpenAI, Anthropic, Google, DeepSeek, Qwen, Zhipu, etc.); API key management; model health checking with latency display; custom model ID registration; provider CRUD with categorized listing (China / International / Aggregation)
- Internationalization (i18n) with 10 locales: zh-CN, zh-TW, en, ja, ko, ru, ar (RTL support), hi, fr, vi; server-side locale resolution from Accept-Language header and cookie preference; client-side language switcher with system-follow option
- Control plane architecture: intent-based write path (command → intent → domain event → projection), projection store with SQLite persistence, degraded-read fallback, outbox pattern for event publishing, semantic history windowing for context-aware chat
- Conversation management: conversation list with pinning support, unread count badges, context menu actions (pin/unpin, dissolve group, add members), drag-to-reorder
- Message input with rich features: multi-line editing (Shift+Enter), image paste from clipboard as base64 attachment, @mention support, toolbar with format/attachment/shortcut actions
- Settings panel: model configuration, language preference, community QR code section; full-page dialog with section navigation
- Responsive layout system: top navigation bar with connection status indicator, left navigation rail with view switching (Chat / Virtual Team / Cron / Settings), resizable panel layout for chat view
- Comprehensive UI component library: 25+ shadcn/ui components including Dialog, Sheet, Command, ContextMenu, DropdownMenu, HoverCard, Popover, ScrollArea, Tabs, Toggle, Tooltip, Progress, Skeleton, etc.
- Execution approval system: intercept and display tool execution requests from agents, approve/deny workflow with real-time status updates
- Gateway connection management: connection status display (connected/connecting/disconnected/error), automatic fleet synchronization, session key management, settings sync across tabs

🏗️ Architecture

- Next.js App Router with RSC (React Server Components) for server-side locale resolution and metadata generation
- Control plane pattern separating read and write paths with intent routing and projection stores
- OpenClaw adapter as the gateway abstraction layer with WebSocket protocol version 3
- State management via React Context + useReducer with 30+ action types for comprehensive UI state
- SQLite-backed projection store for persistent agent, conversation, and cron data
- Modular gateway client architecture with separate concerns: agent config, heartbeat, files, exec approvals, session settings sync, models, and vision

中文：

✨ Features

- 基于 Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui 4 的项目初始脚手架：全栈架构，采用 App Router、服务端渲染和边缘就绪的 API 路由
- 集成 OpenClaw 引擎作为后端运行时：基于 WebSocket 的网关适配器，支持自动重连、方法白名单、心跳监控和请求/响应关联
- 实时流式聊天系统：与 AI Agent 的一对一对话，SSE 令牌流式传输，打字指示器，消息历史加载和会话重置
- 多 Agent 编排群组聊天：创建包含多个 AI Agent 的群组，支持四种协作策略 — 全员响应、智能匹配（基于技能路由）、协调者（委派分配）和轮询（轮流回答）
- 虚拟团队办公室视图：像素风格 2D 办公室可视化，展示 Agent 状态（空闲/工作中/忙碌），交互式工位区域、白板和咖啡机装饰
- Agent 生命周期管理：通过 OpenClaw 网关创建、重命名、删除 Agent；自定义头像上传，支持文件选择器和内置头像库；Agent 资料卡片展示技能标签和状态指示器
- 定时任务（Cron）系统：创建、编辑、运行、暂停和删除定时任务；Cron 表达式构建器 UI；运行历史时间线与状态跟踪；实时 Cron 守护进程状态显示
- 模型供应商配置：多供应商设置（OpenAI、Anthropic、Google、DeepSeek、通义千问、智谱等）；API 密钥管理；模型健康检查与延迟显示；自定义模型 ID 注册；供应商增删改查，分类列表展示（国内 / 国际 / 聚合）
- 国际化（i18n）支持 10 种语言：简体中文、繁体中文、英语、日语、韩语、俄语、阿拉伯语（RTL 支持）、印地语、法语、越南语；服务端通过 Accept-Language 头和 Cookie 偏好解析语言；客户端语言切换器支持跟随系统选项
- 控制平面架构：基于意图的写入路径（命令 → 意图 → 领域事件 → 投影），SQLite 持久化投影存储，降级读取回退，Outbox 模式事件发布，语义历史窗口用于上下文感知聊天
- 会话管理：会话列表支持置顶，未读计数徽章，右键菜单操作（置顶/取消置顶、解散群组、添加成员）
- 消息输入富功能：多行编辑（Shift+Enter），剪贴板图片粘贴为 base64 附件，@提及支持，工具栏包含格式/附件/快捷方式操作
- 设置面板：模型配置、语言偏好、社区二维码区域；全页对话框带分区导航
- 响应式布局系统：顶部导航栏显示连接状态指示器，左侧导航栏支持视图切换（聊天 / 虚拟团队 / 定时任务 / 设置），聊天视图可调整面板布局
- 全面的 UI 组件库：25+ shadcn/ui 组件，包括 Dialog、Sheet、Command、ContextMenu、DropdownMenu、HoverCard、Popover、ScrollArea、Tabs、Toggle、Tooltip、Progress、Skeleton 等
- 执行审批系统：拦截并展示 Agent 的工具执行请求，批准/拒绝工作流与实时状态更新
- 网关连接管理：连接状态显示（已连接/连接中/断开/错误），自动 Fleet 同步，会话密钥管理，跨标签页设置同步

🏗️ Architecture

- Next.js App Router 搭配 RSC（React 服务端组件），用于服务端语言解析和元数据生成
- 控制平面模式分离读写路径，意图路由配合投影存储
- OpenClaw 适配器作为网关抽象层，采用 WebSocket 协议第 3 版
- 状态管理采用 React Context + useReducer，30+ Action 类型覆盖完整 UI 状态
- SQLite 支持的投影存储，持久化 Agent、会话和 Cron 数据
- 模块化网关客户端架构，关注点分离：Agent 配置、心跳、文件、执行审批、会话设置同步、模型和视觉模型
