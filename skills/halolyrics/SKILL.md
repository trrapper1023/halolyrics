---
name: halolyrics
description: 安装、升级和排查 macOS 上的花再 Halo PixelBar 网易云歌词同步。适用于官方网易云 App 播放、长句滑动、暂停显示时钟、TempoHub 自动交接和登录自启。
---

在这个项目的检出目录操作。如果 skill 单独安装，先定位项目目录。使用项目的同一套 `scripts/manage.sh` 命令。

1. 先运行 `status` 和 `doctor`，确认登录服务、网易云播放状态和 USB 控制接口。不要同时运行两个歌词进程。
2. 用户要求安装或升级时运行 `install`。成功后实测短句、长句、暂停、恢复播放以及打开和完全退出 TempoHub。
3. 用户要求卸载时运行 `uninstall`。不要删除早期工作目录或设备厂商软件。
4. 需要诊断模式切换、曲目匹配或 USB 数据时，阅读 [运行与故障定位](references/runtime.md)。分享日志前去除用户路径和歌曲信息。
