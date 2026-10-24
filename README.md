# Seven AI Search Community V1.0

无需账号、会员、充值或 API Key 的网盘搜索站，使用 Next.js、NestJS、Redis 和本地自托管 PanSou。项目自有源码采用 [MIT](LICENSE)，版权署名 **2026 绿藻头**。

**默认部署会一并从固定 PanSou 源码构建搜索服务，不再要求你另找、购买或搭建兼容搜索 API。** 搜索服务从公开网站及 Telegram 频道获取结果；服务器仍须能访问这些公开来源。受限网络可能需要配置你有权使用的网络代理。

## 启动

当前自托管搜索候选位于 `fix/self-hosted-search`，尚未合并 `main`。验收候选请明确克隆该分支；直接克隆默认 `main` 不包含本轮自建搜索修复。

需要 Docker Engine / Docker Desktop 与支持 `--wait` 的 Compose v2 或更新版本。首次构建须能访问 Docker Hub、GitHub codeload、官方 npm、Go 模块服务及 Alpine 软件仓库。

```bash
git clone --branch fix/self-hosted-search https://github.com/RR777-111/seven-ai-search-community-v1.git
cd seven-ai-search-community-v1
docker compose up --build --wait
```

打开 <http://127.0.0.1:3000>，输入关键词搜索。可按百度、夸克、迅雷、阿里、UC 筛选，复制链接，或点击链接在新标签访问。搜索无需网盘登录；分享页是否过期、是否要求网盘账号及能否下载由网盘提供方决定。

可选配置：将 `.env.example` 复制为 `.env`。`WEB_PORT` 修改本地端口；`PANSOU_BASE_URL` 留空就使用随项目启动的服务，通常不需要修改。

```text
浏览器 → Web → API → 本地源码构建的 PanSou → 公开搜索来源
                  → Redis（缓存、IP 限流、并发租约）
```

Compose 启动四个服务，只映射 Web 到宿主机回环地址。API、PanSou 和 Redis 没有宿主端口；健康检查会依次等待服务就绪。没有数据库、账号、钱包、支付或收费 AI Provider。

```bash
docker compose ps
docker compose logs --tail=100 web api pansou
docker compose down
```

`down` 保留搜索缓存和 Redis 卷。默认私有网络为 `10.200.250.0/24`；如与现有网络冲突，在 `.env` 中设置一个空闲的 `COMMUNITY_SUBNET`，不要删除其他项目的网络。

## 搜索来源与网络

默认启用 PanSou 原生的 `pansearch`、`hunhepan` 插件及 Compose 中列出的 12 个公开 Telegram 频道。无需配置 QQ、微博、网盘 Cookie、商户账号或第三方 API Key；未启用需要额外凭据的插件。覆盖范围与启用全部上游插件的站点不完全相同，结果数量、相关性和时效随公开来源变化。

如果能启动但没有结果，先看 `docker compose logs --tail=100 pansou`。健康检查只表示服务可响应，不表示所有外部搜索来源可达。在你有权使用代理的网络中，可设置：

```dotenv
# 示例地址；端口须改成你的代理实际监听端口。
PANSOU_PROXY=http://host.docker.internal:7890
```

然后再次运行 `docker compose up --build --wait`。Docker Desktop 可用 `host.docker.internal` 访问宿主机；Linux 需填写容器实际可达的代理地址。容器里的 `127.0.0.1` 是容器自身。代理不由本项目提供，勿提交含凭据的配置。`PANSOU_PROXY` 影响运行时公开来源访问；镜像与依赖下载需通过 Docker/构建环境自己的网络配置解决。

默认每 IP 每分钟 6 次、每小时 60 次，同时 2 次，全站同时 8 次；Redis 不可用时关闭搜索入口。Web 覆盖客户端转发 IP 头，API 只信任紧邻 Web 的一跳。缓存约 5 分钟，慢来源可能在 PanSou 后台补齐，当前请求返回的结果可能不完整。公开部署需核对实际反向代理拓扑和来源 IP，不要直接公开 API 或 PanSou。

## 构建来源和许可

`docker/pansou.Dockerfile` 校验并编译 PanSou 源码提交 `221665fb2c9279f22af4684ea2d8c0c331eac1cc`，不拉取 PanSou 官方成品镜像。归档 SHA256：`f1476c92c7dc9a5bc04836ef36d48993bdea93e37a2032823f1fc08ee533d3fa`。在固定源码上仅补一行迅雷分享 ID 解析字符集：允许 `-` 与 `_`，避免将完整链接额外解析成 `/s/VP` 等错误短链接。构建时运行真实消息解析回归测试；不猜测、补造或修复历史索引坏链，也不改变页面或搜索业务流程。已有安装需重建 PanSou；旧搜索缓存可能在过期前继续显示旧结果。

必要构建适配：使用 Go 1.27.3；`docker/pansou-go.mod` / `.sum` 将不兼容该编译器的 Sonic 1.14.0 固定为官方支持 Go 1.27 的 1.15.4，并锁定其必要间接依赖。镜像中 `/usr/share/licenses/pansou` 保留 PanSou、Go 及已下载模块的许可文本。Node 依赖固定 pnpm 11.13.1 和锁文件；原生 JSON 解析依赖定点更新到 body-parser 2.4.0，修复压缩正文可导致进程退出的安全公告。

PanSou 固定源码的 LICENSE 与 README 声明 MIT，版权 fish2018；其仓库简介另有“仅供学习研究，请勿以各种形式用于盈利目的”提醒。本集成依据固定源码的明确 MIT 授权进行源码构建，不宣称官方镜像、服务、收费教学或搜索结果资源也获得相同授权；收费配套场景仍须核实上游提醒的适用范围。完整说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

项目 MIT 允许按其条款使用、商业使用、复制、修改和再分发自有软件。第三方依赖保持各自许可证；MIT 不等于整个容器栈或索引资源统一获得 MIT 授权。Seven AI Search 名称及内嵌图形保留于源码与界面；软件许可不额外授予独立商标权或官方背书。

## 2026-10-24 验证范围

- 本机 Docker Desktop、Linux/ARM64：在开始时为空的新构建器中，以 `--no-cache --pull` 完成三个镜像的整体冷构建。API/Web 共享本轮新下载的一次依赖安装（201 包、`reused 0`），PanSou 重新取得固定源码并校验模块；未导入旧构建器缓存。随后新网络、新卷中四服务均健康。构建和实搜通过本机已有网络代理，这不等于独立物理机器、AMD64、离线或所有网络环境通过。
- 续验从公开修复分支全新克隆，另建初始缓存 0B 的构建器，对 Linux/AMD64 三镜像执行 `--no-cache --pull` 冷构建；首次 Docker Hub 认证请求因客户端直连超时，配置已有代理后通过。获准的迅雷解析补丁随后在同一本轮构建器中以 `--no-cache --pull` 重建 PanSou，并在新网络、新卷中启动四个 AMD64 服务，全部健康。本机 ARM64 上仿真运行 AMD64，PanSou 使用本机平台的 Go 交叉编译；这不是独立机器或原生 AMD64 硬件验证，也不是最终补丁镜像重新使用完全空构建器。
- 补丁前回归测试有 6 个含 `-`/`_` 的子例失败；补丁后 9 个子例与相关 9 个 Go 包通过（Go 测试在 ARM64 构建平台执行）。AMD64 仿真中的 API 29 项、Web 31 项和两侧类型检查通过。真实查询“计算机”缓存 miss 返回百度 6、夸克 86、迅雷 9、阿里 2、UC 1；“Python 教程”阿里 11，“Linux”百度 4、夸克 24、阿里 9。结果数量随上游时点变化。对同一条原消息逐项比较，正文及完整迅雷链接保留，解析器原来额外生成的 `/s/VP` 消失；这不证明全部分享内容有效。
- API 29 项、Web 31 项现有测试及类型检查通过；PanSou API/config/util/audit 九个包测试通过。修复后的 JSON、gzip、畸形压缩正文探测后进程存活；该探测未在旧版重现公告所述崩溃，不冒充成功复现。
- 真实查询“计算机”获得百度 6、夸克 24、迅雷 12、阿里 2、UC 1；“Linux”获得夸克 20；“Python 教程”获得阿里 11。均为首次 API 缓存 miss 的实搜结果，不是 Fixture。该数据仅代表当时网络和公开索引状态，不保证其他关键词或链接有效。
- 以上实搜使用容器可达代理；同机直连“Python”返回空结果，Telegram 可达性探测失败。不能宣称受限网络零配置可用。
- 浏览器五类筛选和五类链接复制通过；第 7 次连续请求返回 429，改变伪造转发 IP 仍受同一限制。点击百度链接创建了指向分享地址的新标签，外部标签标题已显示“百度网盘-分享文件”，但读取分享页控件超时；分享内容、全量链接有效性、登录后下载、手机实机均未验收。
- 原生依赖审计仍有其他公告；定向审查未发现当前路径具备其多数触发条件，不代表整个依赖栈无漏洞。新增图片处理、上传、Server Actions 等功能前需重新评估。
- 本轮没有访问或修改生产网站。商业母版本地适配器与社区版一致，但未经生产访问，不能据此断言生产实际启用来源与本配置完全一致。

`tests/pansou-fixture.mjs` 仅为模拟上游测试工具，默认 Compose 不运行它。

## 源码检查

本地检查需要 Node.js 22.23.1、pnpm 11.13.1：

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```
