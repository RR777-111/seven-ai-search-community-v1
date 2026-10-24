# Seven AI Search Community 安装说明

这是本机运行的四服务开源搜索站。搜索不需要账号、AI 模型、API Key、SQLite 或 Stripe；电脑需要已安装并启动 **Docker Desktop**，首次启动需要网络下载容器镜像。Windows 请使用 Docker Desktop 的 **Linux 容器**模式。无需在电脑上安装 Go、Node 或 pnpm。

## 三步启动

1. v1.0.1 正式发布后，从 [GitHub Release](https://github.com/RR777-111/seven-ai-search-community-v1/releases) 下载并解压 `Seven-AI-Search-Community-v1.0.1-安装包.zip`。测试候选包只用于验收，正式版发布前请勿当作正式 Release。
2. 在解压所得文件夹打开终端：Mac 用“终端”，Windows 用 PowerShell。确认 Docker Desktop 已启动。
3. 运行下面这一条命令，等四个服务显示健康后，打开 <http://127.0.0.1:3000>：

```sh
docker compose up --wait -d
```

默认只把网页绑定在本机 `127.0.0.1:3000`；API、PanSou、Redis 不向电脑或公网单独开放端口。Compose 为本版本创建专用容器、网络和卷，不会清理其他项目。安装包中的镜像按 digest 固定；公开 GHCR 镜像可匿名下载。再次开机时先启动 Docker Desktop，再在同一文件夹运行上述命令。

查看四个服务：`docker compose ps`。暂时停用本项目：`docker compose stop`。不要运行 `docker system prune`、`docker volume prune`，也不要为了腾端口删除别的项目。

若想让豆包逐步指导，先把本包的 `INSTALL_CN.md`、`DOUBAO_GUIDE_CN.md` 和 `compose.yaml` 上传给它（不能上传时复制文件内容），再发送 `DOUBAO_PROMPT_CN.txt` 的文字。豆包只能依据你提供的文件和实际报错给建议；它不会因为收到提示词就自动取得你电脑的操作权限。

## 遇到问题

| 现象 | 先检查什么 |
| --- | --- |
| `docker` 命令找不到，或无法连接 Docker | 启动 Docker Desktop，等它显示正在运行；Windows 确认是 Linux 容器模式。 |
| 拉镜像失败或超时 | 检查网络能否访问 `ghcr.io` 和 Docker Hub。受限网络可在 Docker Desktop 使用自己合法可用的系统代理；无需申请模型 API Key。 |
| 3000 端口已占用 | 保留原有服务。Mac 在本文件夹运行 `WEB_PORT=3001 docker compose up --wait -d`；Windows PowerShell 先运行 `$env:WEB_PORT='3001'`，再运行启动命令。随后打开 `http://127.0.0.1:3001`。 |
| 网页能打开但搜索为空或超时 | 先看 `docker compose logs --tail=80 pansou`；外部公开搜索来源可能在你的网络中不可达。需要代理时，`PANSOU_PROXY` 必须填**容器实际可达**的地址。宿主代理若只监听 `127.0.0.1`，容器连接 `host.docker.internal:该端口` 也可能超时；先核实可达性。容器内的 `127.0.0.1` 不是你的电脑。 |
| 提示网络子网冲突 | 保留其他项目的网络。默认使用本项目的 `10.200.249.0/24`；请在确认空闲子网后，通过可选的 `COMMUNITY_SUBNET` 指定另一个 `/24`，或寻求熟悉 Docker 的人协助。 |
| 四服务没有全部健康 | 运行 `docker compose ps`，只查看本项目出错的服务，再运行 `docker compose logs --tail=80 服务名`。不要清理全局镜像、容器或卷。 |

五类网盘索引来自公开第三方来源，数量会变化。找到链接不保证分享仍有效、可免登录或可下载。受限网络不保证免代理；安装包不含代理服务。

想自行从固定源码构建的开发者，可从[公开仓库](https://github.com/RR777-111/seven-ai-search-community-v1)克隆源码，在仓库根目录运行 `docker compose -f compose.yaml -f compose.build.yaml up --build --wait -d`。该方式需要能访问 Docker Hub、GitHub、官方 npm 和 Go 模块服务；基础安装无需使用它。源码及第三方许可见 [LICENSE](LICENSE) 和 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
