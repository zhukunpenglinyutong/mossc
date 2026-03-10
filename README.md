<div align="center">

# MossC (Moss Company)

<img width="120" alt="Image" src="./docs/logo.png" />

**English** · [简体中文](./README.zh-CN.md)

![][github-contributors-shield] ![][github-forks-shield] ![][github-stars-shield] ![][github-issues-shield]

</div>

**MossC** aims to build an AI-powered company where 99% of decisions are made by AI.

> Currently supports OpenClaw Agent, with plans to integrate Claude Code, Codex, and other AI agents in the future. The project is still evolving — at this stage it looks more like a UI layer on top of OpenClaw, but that's not the end goal. The vision is to build an AI company where OpenClaw is just one type of AI employee.

<img src="./docs/banner.png" alt="MossC Banner" width="800" />

---

### Getting Started

#### Prerequisites

- Node.js >= 18
- pnpm >= 8

#### Installation & Launch

```bash
# 1. Clone the repository
git clone https://github.com/zhukunpenglinyutong/mossc.git
cd mossc

# 2. Install dependencies
pnpm install

# 3. Start the development server
pnpm dev
```

Once started, open http://localhost:3000 to access the MossC interface.

#### Connecting to OpenClaw

MossC relies on [OpenClaw](https://github.com/anthropics/openclaw) as the underlying AI Agent engine. You need to deploy and start the OpenClaw service first:

1. Follow the OpenClaw documentation to complete deployment and startup
2. Open the MossC page, go to **Settings → Model Configuration**, and enter the OpenClaw Gateway address and Token
3. If OpenClaw is running locally, MossC will automatically read the connection configuration from `~/.openclaw/openclaw.json` — no manual setup required

#### Production Build

```bash
pnpm build
pnpm start
```

---

### Features

##### Basic Chat

<img src="./docs/banner.png" alt="MossC Banner" width="800" />

##### Agent Persona Panel: Edit & View

<img src="./docs/banner2.png" alt="MossC Banner" width="800" />

##### Model Configuration

<img src="./docs/banner3.png" alt="MossC Banner" width="800" />

##### Create Agent

<img src="./docs/banner4.png" alt="MossC Banner" width="400" />

##### Pin Agent

<img src="./docs/banner5.png" alt="MossC Banner" width="300" />

---

### Roadmap

v0.1: Refine OpenClaw interaction details, evolve toward an AI company interaction model; improve OpenClaw deployment flow and configuration guidance
v0.2: Enable group chat and provide mobile, desktop, and Docker deployment options
v0.3: Integrate Claude Code, Codex, etc., enabling mixed use of OpenClaw with other AI agents
v0.4: Explore self-iteration capabilities and integrate more OpenClaw tools and solutions
v0.5: Under consideration...

---

### License

[MIT](https://github.com/zhukunpenglinyutong/mossc?tab=MIT-1-ov-file)

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=zhukunpenglinyutong/mossc&type=date&legend=top-left)](https://www.star-history.com/#zhukunpenglinyutong/mossc&type=date&legend=top-left)

<!-- LINK GROUP -->

[github-contributors-shield]: https://img.shields.io/github/contributors/zhukunpenglinyutong/mossc?color=c4f042&labelColor=black&style=flat-square
[github-forks-shield]: https://img.shields.io/github/forks/zhukunpenglinyutong/mossc?color=8ae8ff&labelColor=black&style=flat-square
[github-issues-link]: https://github.com/zhukunpenglinyutong/mossc/issues
[github-issues-shield]: https://img.shields.io/github/issues/zhukunpenglinyutong/mossc?color=ff80eb&labelColor=black&style=flat-square
[github-license-link]: https://github.com/zhukunpenglinyutong/mossc/blob/main/LICENSE
[github-stars-shield]: https://img.shields.io/github/stars/zhukunpenglinyutong/mossc?color=ffcb47&labelColor=black&style=flat-square
