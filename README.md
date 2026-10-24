# Seven AI Search Community V1.0

一个无需账号、会员或充值的网盘搜索界面与 API，使用 Next.js、NestJS 和 Redis。项目源码采用 [MIT 许可证](LICENSE)，版权署名为 **2026 绿藻头**。

**本仓库不提供搜索索引或上游服务，也不自动安装 PanSou 官方镜像。真实搜索需要使用者自行提供可访问、且有权使用的 PanSou 兼容 HTTP 接口。没有该接口时，不能完成真实搜索。**

## 功能与结构

接入上游后，可搜索百度、夸克、迅雷、阿里和 UC 网盘结果，按来源筛选、复制链接或在新标签访问。保留现有响应式页面、HTTP 适配器、来源白名单、结果清洗和去重、缓存、超时与错误处理。

```text
浏览器 → Web（Next.js，默认仅宿主机 127.0.0.1 端口）
          → API（NestJS，Compose 私有网络）
              → 使用者配置的外部搜索接口
              → Redis（缓存、IP 限流、搜索并发租约）
```

没有 PostgreSQL、Prisma、账号、钱包、支付或收费 AI Provider 运行依赖。Web 代理会覆盖访客传来的转发 IP 头；API 只信任紧邻 Web 的一跳。默认每 IP 每分钟 6 次、每小时 60 次、同时 2 次，全站同时 8 次。Redis 故障时关闭搜索入口。

## 本地 Docker 启动

需要 Docker Engine、Compose v2 或更新版本。构建需要通过 TLS 访问官方 npm Registry `https://registry.npmjs.org` 和基础镜像仓库。构建固定使用 pnpm 11.13.1，并按锁文件安装；不承诺离线或全新机器无缓存构建已通过。

1. 复制配置：

   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env`，填写 `PANSOU_BASE_URL`，指向你有权使用的兼容接口。API 容器须能访问这个地址；接口应接受 `POST /api/search`。Docker Desktop 上，如果你自己的服务在宿主机 8888 端口，可使用 `http://host.docker.internal:8888`；这是地址示例，不代表本项目提供该服务。Linux 等环境应填容器实际可达的地址，容器中的 `127.0.0.1` 不代表宿主机。

3. 核对配置并启动：

   ```bash
   docker compose -f compose.yaml config --quiet
   docker compose -f compose.yaml up --build -d
   ```

打开 `http://127.0.0.1:3000`。未填写 `PANSOU_BASE_URL` 时，Compose 会直接报错，避免把空配置误当作可搜索服务。需要改本地端口时设置 `WEB_PORT`。

Compose 只启动 Web、API、Redis 三个服务，只向宿主机映射 Web 端口。网络默认使用 `10.200.250.0/24`；如与已有网络冲突，可通过 `COMMUNITY_SUBNET` 设置空闲的私有 `/24` 网段。不要删除其他项目的网络。

```bash
docker compose -f compose.yaml ps
docker compose -f compose.yaml logs --tail=100 web api
docker compose -f compose.yaml down
```

`down` 保留 Redis 卷。不要把商业版环境文件、生产数据库、生产 Redis、生产 API 或收费 Provider 密钥放入本项目。API 不应单独公开端口；公网部署需要按实际代理拓扑核实可信跳数与来源 IP。

## 源码本地开发

需要 Node.js 22.23.1、pnpm 11.13.1，以及你自行提供的非生产 Redis 和有权使用的兼容搜索接口。

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

以下示例假设你自己的 Redis、兼容接口已经分别在本机 6379、8888 端口运行；它不会启动或提供这些服务。在两个终端分别运行：

```bash
REDIS_URL=redis://127.0.0.1:6379 PANSOU_BASE_URL=http://127.0.0.1:8888 PANSOU_TIMEOUT_MS=10000 pnpm --filter api start
API_BASE_URL=http://127.0.0.1:3001 pnpm --filter web dev
```

## 许可、品牌与外部软件

源码许可证见 [LICENSE](LICENSE)，外部软件及生成文件说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。MIT 允许按其条款使用、商业使用、复制、修改和再分发本项目软件；`package.json` 中的 `private: true` 仅防止误发布到 npm。

Seven AI Search 名称和内嵌图形保留在源码与界面中。本项目的 MIT 软件许可不额外授予独立商标许可或官方背书；这段说明不缩减 MIT 已授予的软件使用、修改、商业使用及分发权，也不声称存在已验证的商标注册。课程、视频、社群服务和第三方搜索结果资源不因源码公开而附带授权。

本项目仅保留自有 PanSou 兼容 HTTP 适配代码，不包含 PanSou Go 源码或镜像层。当前配置已移除官方 PanSou 镜像自动集成。有关官方镜像、服务及收费教学等场景的适用条件，未由本项目确认；需要实际使用者自行核实，不应把本项目 MIT 当作第三方软件或服务的授权。

## 验证范围与已知限制

- 现有运行代码经过本地模拟上游的功能验证，覆盖首页、API 健康、资源过滤、复制、限流、并发与错误处理；这些验证不等于真实 PanSou 搜索通过。
- 历史 Web/API 编译复用了已验证的依赖缓存；全新用户机器无缓存构建仍未验证。
- 本次发布仅调整许可证、文档和上游配置，不改变搜索、UI、鉴权或资金业务代码。真实上游可达性、索引内容和资源链接有效性取决于使用者的配置与上游。
- `tests/pansou-fixture.mjs` 仅供测试，返回模拟结果，不是搜索引擎或生产数据源。
- Git 历史中的初始提交是内部技术候选，可能含当时的内部状态文字及官方镜像配置引用。请使用当前 `main` 的说明和配置；旧 Compose 不属于当前推荐启动路径，历史也不构成第三方镜像使用条件已确认的证明。
