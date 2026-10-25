<p align="center">
  <strong>Hermes WebUI</strong>
  <a href="./README.md">English</a>
</p>

<p align="center">
  给 <a href="https://github.com/NousResearch/hermes-agent">Hermes Agent</a> 用的自托管 Web 控制台。<br/>
  在浏览器里和你的 Agent 对话，管理它的配置、模型、技能、MCP、定时任务、看板和消息渠道 ——<br/>
  任何能连到你服务器的设备都可以。
</p>

<p align="center">
  <a href="https://github.com/EKKOLearnAI/hermes-web-ui">源码</a>
  ·
  <a href="./docs/getting-started.md">快速开始</a>
  ·
  <a href="./ARCHITECTURE.md">架构说明</a>
  ·
  <code>npm install -g hermes-web-ui && hermes-web-ui start</code>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/hermes-web-ui"><img src="https://img.shields.io/npm/v/hermes-web-ui?style=flat-square&color=blue" alt="npm 版本"/></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/hermes-web-ui?style=flat-square" alt="许可证"/></a>
</p>

> **本仓库是 Hermes 专用分支。** 早期版本是一个多 Agent 工作台（Ekko Agent、14 种
> 编程 Agent 集成、群聊、可视化工作流、语音、桌面端/Electron 打包、ESP32 设备等），
> 这些**已全部移除**，Hermes Agent 现在是唯一运行时。完整的保留/删除清单见
> [`docs/hermes-only-scope.md`](./docs/hermes-only-scope.md)，量化对比见
> [`docs/hermes-only-baseline.md`](./docs/hermes-only-baseline.md)。

## 它是做什么的

Hermes Agent 很强，但只能在终端里用。这个 WebUI 给一套 Hermes 安装加了个浏览器前端，
让你可以用手机、笔记本或共用机器访问，不用 SSH 登录。

| 模块 | 能力 |
| --- | --- |
| **对话** | Socket.IO 流式回复、工具调用轨迹、任务卡片实时步骤进度、审批与澄清交互、消息引用、单轮用量与成本 |
| **历史** | SQLite 持久化会话库，支持搜索、分类、归档、消息删除；旧会话保持可读 |
| **Agent 管控** | 配置档案、供应商、模型、记忆、技能、技能包、插件、MCP 服务器、运行时版本 |
| **自动化** | 定时任务、带指派人和附件的看板、Journey 关系图 |
| **消息渠道** | 一个页面配置 10 个平台（见下文） |
| **工作区** | 文件浏览与内联预览、Web 终端、工作区差异追踪、写入审批 |
| **运维** | 日志、用量与成本报表、性能监控、主题、用户与角色 |

## 环境要求

- **Node.js >= 23**（`engines` 字段强制校验，实测使用 Node 24）
- **Python 3.10+**，以及一个可用的 [Hermes Agent](https://github.com/NousResearch/hermes-agent) 安装
- Linux / macOS / Windows。主目标是 Linux，Docker 镜像仅支持 Linux。

WebUI **不捆绑** Hermes。它通过 `HERMES_HOME`（默认 `~/.hermes`）发现已有安装，
并复用其 Python 环境。

## 安装

### npm

```bash
npm install -g hermes-web-ui
hermes-web-ui start
```

然后打开 `http://localhost:8648`。首次运行需要创建管理员账号：

```bash
hermes-web-ui reset-default-login   # admin / 123456
```

**请立即**在「设置 → 当前账号」里改掉这个密码。

### Docker

```bash
docker compose up -d
```

卷挂载、环境变量、以及如何挂载已有的 `~/.hermes`，见 [`docs/docker.md`](./docs/docker.md)。

### 从源码

```bash
npm ci --ignore-scripts
npm rebuild node-pty        # Web 终端所需的原生模块
npm run build
npm start
```

`npm run build` 会做客户端与服务端的类型检查、重新生成 OpenAPI 规范、产出 `dist/`。
完整命令与编码规范见 [`DEVELOPMENT.md`](./DEVELOPMENT.md)。

## 配置

所有状态存放在 `HERMES_WEB_UI_HOME`（默认 `~/.hermes-web-ui`）。Hermes 自己的状态
留在 `HERMES_HOME`（默认 `~/.hermes`），WebUI 只通过文档化的 Agent API 访问它。

| 环境变量 | 默认值 | 用途 |
| --- | --- | --- |
| `HERMES_WEB_UI_HOME` | `~/.hermes-web-ui` | WebUI 数据库、日志、运行时下载 |
| `HERMES_HOME` | `~/.hermes` | Hermes Agent 数据目录 |
| `PORT` | `8648` | HTTP 监听端口 |
| `HERMES_BIN` | `PATH` 中的 `hermes` | 显式指定 Hermes CLI 路径 |
| `HERMES_AGENT_ROOT` | 自动探测 | 显式指定 Agent 根目录（含 `run_agent.py`） |
| `AUTH_JWT_SECRET` | 自动生成 | 覆盖 JWT 签名密钥 |

运行时探测会**顺着 Hermes 启动脚本逐层解析** Python 解释器，支持多级包装，例如
`~/.local/bin/hermes → <安装目录>/.hermes/bin/hermes → python3`。

## 支持的消息渠道

Telegram、Discord、Slack、WhatsApp、Matrix、飞书、钉钉、QQBot、微信、企业微信 ——
每个都可以单独配置凭据、允许/忽略列表、@ 提及规则和可选的 SOCKS 代理。在「渠道」页配置。

## 架构

```
浏览器 ── Socket.IO /chat-run ──► ChatRunSocket
                                     │
                                     ▼
                                handleBridgeRun
                                     │
                                     ▼
                             AgentBridgeClient  ──stdio──►  hermes_bridge.py
                                                                  │
                                                                  ▼
                                                           run_agent.AIAgent
```

- `packages/client` —— Vue 3 客户端、Pinia 状态、i18n（12 种语言）
- `packages/server` —— Koa API、Socket.IO、SQLite 持久化
- `packages/shared` —— 前后端共用的辅助模块
- `packages/skills` —— 注入到 Hermes 配置档案的内置 `SKILL.md`
- `bin/` —— CLI 入口和托管的 MCP stdio 服务

`packages/server/src/bootstrap/realtime.ts` 独占唯一的 Socket.IO `Server`，各功能模块
只挂载命名空间。完整说明见 [`ARCHITECTURE.md`](./ARCHITECTURE.md)。

## Hermes 专用分支移除的内容

从旧版本迁移过来的用户请留意：

- **包**：`ekko-agent`、`desktop`（Electron）、`esp32-c3`、`esp32-s3`
- **服务端**：编程 Agent 模块、群聊、可视化工作流、全局 Agent、语音/STT/TTS、
  App 中继与连接、MCU/ESP32 设备、JEV、会话分享、Model API、公告、媒体、
  桌面浏览器、局域网发现
- **客户端**：原有 50 个路由移除了 25 个；Ekko、Agent Manager、Coding Agent Config、
  Petdex、工作流、群聊、语音相关界面全部移除

**数据不会丢。** 被移除功能的 SQLite 表原样保留，旧会话仍能在「历史」里正常显示。
对已移除运行时发起新对话会被拒绝，返回
`This session belongs to a removed runtime and is read-only`。

MCP 工具标识（`ekko_studio_*`、`ekko-studio-*`）**保留原名字**，因为这些是已经写入
Hermes 配置档案的通信协议字符串，改名会让现有配置失效。

## 开发

```bash
npm run dev              # 同时启动 Vite 客户端与 Koa 服务端
npm run test             # Vitest 单元测试
npm run test:e2e         # Playwright 浏览器测试
npm run harness:check    # 仓库护栏检查
npm run build            # 类型检查并构建前后端
```

当前实测规模：服务端 328 个 TS 文件 / 58.2k 行，客户端 325 个文件 / 96.3k 行，
488 个测试文件，6 个 CI 工作流，233 个 OpenAPI 端点。

## 许可证

BSL-1.1，见 [`LICENSE`](./LICENSE)。
