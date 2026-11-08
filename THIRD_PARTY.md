# 第三方代码与来源

- `src/pixelbar-protocol.cjs`：四个函数提取自 [nxz1026/Mineradio](https://github.com/nxz1026/Mineradio/blob/96a1726423c45d0aa3a9e9149ad6e70bad28ba9d/desktop/halo-lyric-sync.js)，提交 `96a1726423c45d0aa3a9e9149ad6e70bad28ba9d`，源文件 Git blob `fdc407368755949e2aac22edc6d0058b9d9d8d5f`。仓库使用 GPL-3.0-only。保留上游关于 HaloLyricSync、HaloPixelToolBox 和 Seraph310/halo-pixelbar-mcp 的协议来源记录。此仓库没有分发这些项目的其他实现。
- `vendor/mediaremote-adapter/`：[ungive/mediaremote-adapter](https://github.com/ungive/mediaremote-adapter/tree/0e82bf1)，上游提交 `0e82bf1`。保留 Jonas van den Berg 与贡献者的 BSD-3-Clause 许可。发布物提供源码，安装时本地构建。
- `node-hid@3.4.0` 和传递依赖：由 `package-lock.json` 固定版本和完整性。安装时通过 npm 获取。各包许可随 npm 包保留，node-hid 和其原生 HIDAPI 部件的许可见包内文件。
- 早期的 CloudLyrics 实验、MineRadio 播放器和歌词缓存均不属于当前运行程序，未纳入分发。
