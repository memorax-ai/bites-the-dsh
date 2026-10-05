# Bites the DSH

[English](README.md) | 简体中文

[![Powered by Harmony](https://memorax-ai.github.io/dsh-harmony/harmony-powered.svg)](https://memorax-ai.github.io/dsh-harmony/)

为 DeepSeek Harness WebUI 提供完全只读、可脚本控制的会话回放。

https://github.com/user-attachments/assets/3c9dfdcf-a454-4750-9edf-76771ed5a9a6

演示中同时使用了 Bites the DSH 与 [dsh-turn-fold](https://github.com/memorax-ai/dsh-turn-fold)。

插件直接将原生会话切换为回放视图，不会打开新的面板。点击原生会话标题栏中的一个按钮即可进入回放。回放期间，会话完全只读：原生输入框以及会改变会话的操作都会被禁用，但界面和脚本仍可自由移动时间光标，不会修改源会话。

## 当前实现

- 原生会话标题栏入口与紧凑的回放控制组件。
- 支持暂停、正放、倒放、逐事件移动、倍速、可调的空闲间隔压缩，以及按事件、轮次或时间直接跳转。
- 可选的模拟输入会在原生只读输入框中预览下一条用户直接输入的消息，不会触碰实时草稿。
- 通过 `ctx.sessionPlayback` 暴露每会话可观察控制器，供脚本单独控制时间。
- 使用 DSH 原生 `ChatView` 构建历史投影；源会话与实时头部仍会独立继续更新。
- 历史时间线提供 `playbackClock: { kind: 'historical', time: cursorTime }`，避免投影消费者将历史中尚未结束的轮次误认为实时任务。
- 回放期间禁用原生输入框、模型选择、停止、分支和助手写入操作；浏览与回放控制保持可用。
- 使用 DSH 主题变量，并提供中英文界面，不会创建独立面板。

当前开发基线为 DSH `0.1.5-rc.2`，同时检查 `0.1.6-alpha.2` 和 `0.1.7-rc.2`。本次迁移依赖新版 Conversation/Chat 服务。如果 Harmony 选择器发生漂移，自动化测试会直接失败，而不会静默修改错误的组件。

另明确支持 DSH `0.2.0-rc.2`，已检查其实际 UI 类型、bundle 选择器、浏览器启动及与 Turn Fold 的组合加载。原生 assembler 会在 Conversation 激活后解析；组件装饰器在 slot hook 注册前也能订阅共享的回放 controller。回放行为由 bundle 集成测试覆盖；真实历史会话的浏览器检查和 macOS/Linux 浏览器验证仍需另行执行。

## 安装

```sh
dsh plugin --profile web add @ch4acko3/bites-the-dsh
dsh harmony status --profile web
```

Bites the DSH 的四个补丁都应显示为 `bound`。重新加载 WebUI，打开一个会话，然后点击原生会话标题栏中的 **回放会话**。

## 脚本控制

其他 DSH 插件可以通过提供的 Cordis 服务使用同一个每会话时钟：

```ts
const playback = ctx.sessionPlayback

playback.enter(sessionId)
playback.seekTime(sessionId, Date.parse('2026-08-20T12:00:00Z'))
playback.play(sessionId, 1)
playback.pause(sessionId)
playback.exit(sessionId)
```

`seekTime` 等接口的时间值使用 Unix epoch 毫秒，与 JavaScript `Date` 和记录事件的时间戳一致。

该服务还支持按事件或轮次跳转、倒放、倍速与空闲间隔设置、订阅以及位置读取。它不会暴露任何修改源会话的操作。

## 开发

需要 Node.js `^22.22.3 || >=24.11.1` 与 pnpm 11。

```sh
pnpm install
pnpm check
```

## CI/CD

每次推送到 `main` 以及每个拉取请求都会运行 `pnpm check` 并验证 npm 包内容。推送与 `package.json` 版本一致的 `v<版本号>` tag 后，会运行相同检查、创建对应的 GitHub Release，并通过 Trusted Publishing（OIDC）将公开包发布到 npm，同时自动生成 provenance，无需在 GitHub 中保存 npm token。

## 许可证

MIT
