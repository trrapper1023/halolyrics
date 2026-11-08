# halolyrics

在网易云音乐官方 Mac App 播歌，花再 Halo PixelBar 通过 USB 显示同步歌词。短句居中，长句滑到句尾。暂停或停止播放时显示内置时钟。打开 TempoHub 自动让出控制，完全退出后自动接回。

独立社区项目，与设备或音乐平台厂商无隶属关系。

| 实机环境 | 状态 |
| --- | --- |
| Apple Silicon，macOS 27.2，网易云 3.1.12，Halo PixelBar USB `2d99:a160` | 原本机实现已验证播放、滑动、时钟和 TempoHub 交接 |
| 其他设备、系统或 App 版本 | 待验证 |

## 自助安装

需要 Node.js 24（含 npm）、Apple Command Line Tools、支持数据传输的 USB 线和网易云音乐官方 App。先把音箱切到 USB 声卡输入。下载并解压仓库后，在目录内运行：

```sh
./scripts/manage.sh install
./scripts/manage.sh status
```

安装会构建原生媒体适配器并注册当前用户的登录服务。现有同名服务会在构建成功后原地升级。日常使用只需打开网易云播放。设置音箱时打开 TempoHub，完成后用 `⌘Q` 完全退出。也可使用仓库里的 [Codex skill](skills/halolyrics/SKILL.md) 安装和排障。

```sh
./scripts/manage.sh doctor
./scripts/manage.sh uninstall
```

卸载移除本安装器管理的运行文件、日志和登录项。由早期手工安装留下的文件可保留，不影响其他应用。诊断日志可能含当前歌曲名，公开提交前请检查并删去个人信息。

## 构建与验收

```sh
npm ci --no-audit --no-fund
./scripts/build-adapter.sh
npm test
```

版本锁见 `package-lock.json`，上游来源见 [THIRD_PARTY.md](THIRD_PARTY.md)。发布验收见 [RELEASE.md](RELEASE.md)。

程序通过 macOS 系统媒体接口读取当前歌曲和进度，只在网易云 App 播放时向网易云请求匹配的歌词。系统媒体接口和网易云歌词接口未承诺稳定，系统或 App 更新可能影响兼容性。某些录音版本匹配不上或没有带时间戳的歌词。

## 人工安装与排障

完整源码、skill 和自助安装免费。可另约按次人工安装与排障服务，服务范围和价格在下单前确认。当前版本没有收款入口。

本项目采用 GPL-3.0-only，第三方组件保留各自许可和署名。
