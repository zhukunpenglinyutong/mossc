export interface ChangelogEntry {
  version: string
  date: string
  content: {
    en: string
    zh: string
  }
}

export const CHANGELOG_DATA: ChangelogEntry[] = [
  {
    version: "0.0.1",
    date: "2026-03-10",
    content: {
      en: `✨ Features
- Initial project scaffold based on Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui 4: full-stack architecture with App Router, server-side rendering, and edge-ready API routes
- Integrate OpenClaw engine as backend runtime: WebSocket-based gateway adapter with auto-reconnect, method allowlisting, heartbeat monitoring, and request/response correlation
- Chat system with real-time streaming: 1-on-1 conversations with AI agents, SSE-based token streaming, typing indicators, message history loading, and session reset
- Group chat with multi-agent orchestration: create groups with multiple AI agents, support four collaboration strategies — All Respond, Smart Match, Coordinator, and Round Robin
- Virtual Team office view: pixel-art 2D office visualization showing agent status, interactive desk areas, whiteboard, and coffee machine decorations
- Agent lifecycle management: create, rename, delete agents via OpenClaw gateway; custom avatar upload with file picker and built-in avatar gallery; agent profile cards with skill tags
- Scheduled Jobs (Cron) system: create, edit, run, pause, and delete cron jobs; cron expression builder UI; run history timeline with status tracking
- Model provider configuration: multi-provider setup (OpenAI, Anthropic, Google, DeepSeek, Qwen, Zhipu, etc.); API key management; model health checking with latency display
- Internationalization (i18n) with 10 locales: zh-CN, zh-TW, en, ja, ko, ru, ar (RTL), hi, fr, vi; server-side and client-side locale resolution
- Control plane architecture: intent-based write path, projection store with SQLite persistence, degraded-read fallback, outbox pattern, semantic history windowing
- Conversation management: pinning, unread count badges, context menu actions, drag-to-reorder
- Message input with rich features: multi-line editing, image paste from clipboard, @mention support
- Settings panel: model configuration, language preference, community section
- Responsive layout: top navigation with connection status, left navigation rail, resizable panel layout
- 25+ shadcn/ui components: Dialog, Sheet, Command, ContextMenu, DropdownMenu, HoverCard, Popover, ScrollArea, Tabs, and more
- Execution approval system: intercept tool execution requests from agents, approve/deny workflow
- Gateway connection management: connection status display, automatic fleet sync, session key management

🏗️ Architecture
- Next.js App Router with RSC for server-side locale resolution and metadata generation
- Control plane pattern separating read and write paths with intent routing and projection stores
- OpenClaw adapter as the gateway abstraction layer with WebSocket protocol version 3
- State management via React Context + useReducer with 30+ action types
- SQLite-backed projection store for persistent agent, conversation, and cron data
- Modular gateway client architecture with separate concerns`,
      zh: `✨ Features
- 基于 Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui 4 的项目初始脚手架：全栈架构，App Router、服务端渲染、边缘就绪 API 路由
- 集成 OpenClaw 引擎作为后端运行时：WebSocket 网关适配器，支持自动重连、方法白名单、心跳监控
- 实时流式聊天系统：与 AI Agent 一对一对话，SSE 令牌流式传输，打字指示器，消息历史加载
- 多 Agent 编排群组聊天：四种协作策略 — 全员响应、智能匹配、协调者、轮询
- 虚拟团队办公室视图：像素风格 2D 办公室可视化，展示 Agent 状态，交互式工位区域
- Agent 生命周期管理：通过 OpenClaw 网关创建、重命名、删除 Agent；自定义头像上传；Agent 资料卡片
- 定时任务（Cron）系统：创建、编辑、运行、暂停、删除定时任务；Cron 表达式构建器；运行历史时间线
- 模型供应商配置：多供应商设置（OpenAI、Anthropic、Google、DeepSeek、通义千问、智谱等）；API 密钥管理；健康检查
- 国际化（i18n）支持 10 种语言：简体中文、繁体中文、英语、日语、韩语、俄语、阿拉伯语（RTL）、印地语、法语、越南语
- 控制平面架构：基于意图的写入路径，SQLite 持久化投影存储，降级读取回退，Outbox 模式，语义历史窗口
- 会话管理：会话列表置顶、未读计数徽章、右键菜单操作
- 消息输入富功能：多行编辑、剪贴板图片粘贴、@提及支持
- 设置面板：模型配置、语言偏好、社区区域
- 响应式布局：顶部导航栏连接状态、左侧导航栏视图切换、可调整面板
- 25+ shadcn/ui 组件：Dialog、Sheet、Command、ContextMenu、DropdownMenu、HoverCard、Popover、ScrollArea、Tabs 等
- 执行审批系统：拦截 Agent 工具执行请求，批准/拒绝工作流
- 网关连接管理：连接状态显示、自动 Fleet 同步、会话密钥管理

🏗️ Architecture
- Next.js App Router 搭配 RSC，用于服务端语言解析和元数据生成
- 控制平面模式分离读写路径，意图路由配合投影存储
- OpenClaw 适配器作为网关抽象层，WebSocket 协议第 3 版
- 状态管理采用 React Context + useReducer，30+ Action 类型
- SQLite 支持的投影存储，持久化 Agent、会话和 Cron 数据
- 模块化网关客户端架构，关注点分离`,
    },
  },
]
