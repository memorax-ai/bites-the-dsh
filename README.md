# Bites the DSH

English | [简体中文](README.zh-CN.md)

[![Powered by Harmony](https://memorax-ai.github.io/dsh-harmony/harmony-powered.svg)](https://memorax-ai.github.io/dsh-harmony/)

Read-only, scriptable session playback for the DeepSeek Harness WebUI.

https://github.com/user-attachments/assets/3c9dfdcf-a454-4750-9edf-76771ed5a9a6

The demo shows Bites the DSH together with [dsh-turn-fold](https://github.com/memorax-ai/dsh-turn-fold).

The plugin turns the native conversation into a replay view without opening a separate panel. A single native session-header control enters replay. While replay is active, the conversation is fully read-only: the native composer and session-changing interactions are blocked, while UI and scripts may move time without mutating the source session.

## Current implementation

- Native session-header entry and compact playback controls.
- Pause, forward play, reverse play, event stepping, speed selection, adjustable idle-gap compression, and direct event/turn/time seeking.
- Optional simulated typing previews the next direct user message in the native read-only composer without touching its live draft.
- A per-session observable controller exposed as `ctx.sessionPlayback` for time-only scripting.
- Historical projection through DSH's native `ChatView`; the source session and live head continue independently.
- Historical timelines expose `playbackClock: { kind: 'historical', time: cursorTime }` so projection consumers never treat an open historical turn as live wall-clock work.
- Native composer, model, stop, branch, and assistant write actions are disabled during replay; viewing controls remain interactive.
- English and Chinese labels using DSH theme tokens, without a separate panel.

The development baseline is DSH `0.1.5-rc.2`; `0.1.6-alpha.2` and `0.1.7-rc.2` are also checked. This migration requires the new Conversation/Chat services. Harmony selector drift fails the automated test instead of silently changing the wrong component.

## Install

```sh
dsh plugin --profile web add @ch4acko3/bites-the-dsh
dsh harmony status --profile web
```

All four Bites the DSH patches should report `bound`. Reload the WebUI, open a
session, then use **Replay session** in the native session header.

## Script control

Other DSH plugins can use the same per-session clock through the provided
Cordis service:

```ts
const playback = ctx.sessionPlayback

playback.enter(sessionId)
playback.seekTime(sessionId, Date.parse('2026-08-20T12:00:00Z'))
playback.play(sessionId, 1)
playback.pause(sessionId)
playback.exit(sessionId)
```

Time values such as the argument to `seekTime` use Unix epoch milliseconds,
matching JavaScript `Date` values and recorded event timestamps.

The service also supports event and turn seeking, reverse playback, rate and
idle-gap settings, subscriptions, and position reads. It deliberately exposes
no operation that mutates the source session.

## Development

Requires Node.js `^22.22.3 || >=24.11.1` and pnpm 11.

```sh
pnpm install
pnpm check
```

## CI/CD

Every push to `main` and every pull request runs `pnpm check` and verifies the
npm package contents. Pushing a `v<package.json version>` tag runs the same
checks, creates the matching GitHub Release, and publishes the public package
to npm through Trusted Publishing (OIDC), with automatic provenance and no npm
token stored in GitHub.

## License

MIT

Compatibility check (2026-09-28): 26 unit tests match the DSH 0.1.7-rc.2 compiled Conversation/Chat bundles, including all four Harmony selectors. Historical chat hooks read the projected node store; releasing a Session removes subscriptions, pending history state and read-only mode. Browser interaction and macOS/Linux validation remain separate from these Windows checks.
