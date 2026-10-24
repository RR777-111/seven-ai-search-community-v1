# Seven AI Search Community V1.0（内部技术预审候选）

这是从 Seven AI Search Paid Legacy 中逐文件筛出的纯搜索候选。当前只供内部技术预审；源码权属、视觉素材、第三方许可及 PanSou 使用条件尚未全部闭合，**不得公开仓库、向社群分发源码或镜像、发布 Release**。

## 能做什么

打开首页，输入关键词，查看百度、夸克、迅雷、阿里和 UC 网盘结果；按来源筛选，复制链接或在新标签访问。无需注册、登录、会员、积分或充值。保留了原版的响应式搜索页面、PanSou 适配器、来源白名单、结果清洗和去重、缓存、超时与错误处理。没有新增排序。

## 结构

```text
浏览器 → Web（Next.js，仅宿主机 127.0.0.1 端口）
          → API（NestJS，Compose 私有网络）
              → PanSou（固定镜像 digest）
              → Redis（缓存、IP 限流、搜索并发租约）
```

没有 PostgreSQL、Prisma、账号、钱包、支付或收费 AI Provider 运行依赖。Web 代理会覆盖访客传来的转发 IP 头；API 只信任紧邻 Web 的一跳。默认限制每 IP 每分钟 6 次、每小时 60 次、同时 2 次，全站同时 8 次。Redis 故障时限流关闭搜索入口，不放行匿名流量。

## 本地 Docker 部署

前提：Docker Engine 和 Compose v2；构建环境须能通过 TLS 访问官方 npm Registry `https://registry.npmjs.org`，并访问公开基础镜像仓库。首次构建由 Node 镜像自带的 Corepack 从官方 npm Registry 获取固定 `pnpm@11.13.1`，再按 `pnpm-lock.yaml` 安装依赖；源码包无需携带 pnpm 归档。Node 镜像自带 Corepack 的默认签名/完整性校验未关闭，取得版本后关闭 Corepack 的进一步联网；依赖安装继续使用 `--frozen-lockfile`，`pnpm-workspace.yaml` 的 `allowBuilds` 继续拒绝 `@scarf/scarf` 和 `sharp` 安装脚本。此路径依赖构建时联网，不承诺离线构建或全新用户环境通过。请先核对许可证与公开安全门，当前只允许私有本地使用。

```bash
cp .env.example .env
docker compose -f compose.yaml config --quiet
docker compose -f compose.yaml up --build -d
```

浏览器打开 `http://127.0.0.1:3000`，直接搜索。需要改本机端口时，把 `.env` 中的 `WEB_PORT` 改为未占用端口。Compose 只有 Web 映射宿主机端口；API、PanSou、Redis 留在名为 `seven-ai-search-community-v1` 的独立 Compose 项目和网络内。PanSou 镜像已固定到官方 GHCR 包页面显示的 digest，不使用 `latest`，并显式关闭 PanSou 自带认证。Redis 使用独立命名卷，停止容器不会删除数据。

Compose 为 Community 网络默认指定 `10.200.250.0/24`，以避开本机已耗尽的 Docker 自动地址池。若你的机器已有该子网，请先核对本机路由和现有 Docker 网络，再用 `COMMUNITY_SUBNET` 设置不冲突的私有 `/24` 网段；不要删除其他项目网络。

查看状态和停止：

```bash
docker compose -f compose.yaml ps
docker compose -f compose.yaml logs --tail=100 web api
docker compose -f compose.yaml down
```

`down` 保留 Redis 卷。不要在未确认数据可删时运行带 `-v` 的命令。不要把商业版 `.env`、生产数据库、生产 Redis、生产 API、GHCR 凭据或收费 Provider 密钥放入此候选。

## 源码本地开发

需要 Node.js 22.23.1 和 pnpm 11.13.1。先安装锁文件中的依赖，并自行启动非生产 Redis 与 PanSou。API 默认仅监听 `127.0.0.1:3001`，Web 开发服务默认使用 `http://127.0.0.1:3001` 作为 API 目标。以下地址只是本机示例，不得填入商业生产地址。

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

分别在两个终端启动本地服务：

```bash
REDIS_URL=redis://127.0.0.1:6379 PANSOU_BASE_URL=http://127.0.0.1:8888 PANSOU_TIMEOUT_MS=10000 pnpm --filter api start
API_BASE_URL=http://127.0.0.1:3001 pnpm --filter web dev
```

Compose 中 API 使用 `APP_HOST=0.0.0.0` 仅供内部网络访问，Web 使用 `WEB_HOST=0.0.0.0` 供容器端口映射。不要单独公开 API 端口；若部署到反向代理后，需要重新审查可信代理跳数和真实客户 IP，再决定公网放行。

## 搜索安全与故障

关键词经服务端验证，长度 1–100 字符；来源白名单仅允许五类网盘，外链只接受 HTTP(S)，新标签链接使用 `noopener noreferrer`。PanSou 请求设有超时与重试，Redis 缓存有有效期和过期回退。访客达到限流会收到 429 和重试秒数；同一 IP 重复或超过并发槽位会收到 409；上游不可用返回错误，不要求登录或充值。

如果页面打不开，先运行 `docker compose -f compose.yaml ps`；如果搜索失败，检查 API、Redis 和 PanSou 日志。不要复制真实密钥或完整生产日志到工单。首次 PanSou 索引结果取决于上游，资源有效性需用户自行核实。

## 审查状态

本目录是内部技术预审候选，尚未获得公开源码授权。正式版权主体、MIT 选择、13 个视觉文件权利及 PanSou 上游解释仍待确认；既有许可证和第三方声明草案均不是生效的公开授权或完整声明；本内部包附带的第三方声明草案也只用于审查。内部审计证据保存在独立目录，不随拟议公开源码包提供。搜索结果中的外部资源链接不授予资源本身的传播权。

此前 Task8 验证的是携带本地 pnpm 归档的旧 Dockerfile。本任务在受控 npm 代理环境下，使用本 Dockerfile 实际完成 Web/API 构建，并在无外网容器中完成首页及 API 健康冒烟。全新用户环境与真实 PanSou 搜索未在本任务重新验证。
