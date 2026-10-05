import type {
  ConversationNodeAssembler,
  UiConversation,
  ConversationSnapshot as NativeConversationSnapshot,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { PlaybackSnapshot as ConversationSnapshot } from './playback-snapshot.js'
import type { PlaybackState } from './playback-controller.js'
import { withConversationPlaybackClock } from './projection-clock.js'
import {
  EMPTY_PLAYBACK_EVENTS,
  PLAYBACK_TARGET,
  type PlaybackEventSnapshot,
} from './raw-events.js'

declare const require: (name: string) => unknown

let conversationRuntime: (Pick<UiConversation, 'events' | 'views'> & {
  Assembler: typeof ConversationNodeAssembler
}) | undefined

export function configurePlaybackProjection(ctx: ClientContext): void {
  // The native module imports our decorators while its own factory is running.
  // Resolve its assembler only after uiConversation has activated.
  const { ConversationNodeAssembler: Assembler } = require(
    '@deepseek-ai/dsh-client-ui-conversation/client',
  ) as typeof import('@deepseek-ai/dsh-client-ui-conversation/client')
  conversationRuntime = {
    Assembler,
    events: ctx.uiConversation.events,
    views: ctx.uiConversation.views,
  }
}

export function playbackEventsOf(snapshot: NativeConversationSnapshot): PlaybackEventSnapshot {
  const views = snapshot.views as unknown as {
    get(target: string): unknown
  }
  return views.get(PLAYBACK_TARGET) as PlaybackEventSnapshot | undefined
    ?? EMPTY_PLAYBACK_EVENTS
}

export function projectConversationSnapshot(
  snapshot: ConversationSnapshot,
  playback: PlaybackState,
): ConversationSnapshot {
  if (playback.mode === 'live') return snapshot
  return withConversationPlaybackClock(
    projectConversationSnapshotAtCursor(snapshot, playback.cursorSeq),
    playback.cursorTime,
  )
}

export function projectConversationSnapshotAtCursor(
  snapshot: ConversationSnapshot,
  cursorSeq: number,
): ConversationSnapshot {
  if (conversationRuntime === undefined) {
    throw new Error('Playback projection runtime is not configured')
  }

  const inputs = playbackEventsOf(snapshot).entries
    .filter(({ event }) => event.seq <= cursorSeq)
    .map(({ event }) => ({ type: 'event' as const, event }))
  const assembler = new conversationRuntime.Assembler(
    conversationRuntime.events,
    conversationRuntime.views,
  )
  assembler.replaceWindow(inputs, snapshot.hasMore)
  assembler.activateTarget('chat')
  assembler.activateTarget(PLAYBACK_TARGET)
  assembler.flush()

  const chat = assembler.snapshot('chat') as ChatSnapshot | undefined
  if (chat === undefined) {
    throw new Error('Playback projection could not resolve the native chat view')
  }
  const views = {
    get: (target: string) => target === 'chat'
      ? chat
      : (assembler as unknown as { get(target: string): unknown }).get(target),
  } as ConversationSnapshot['views']

  return {
    ...snapshot,
    views,
    chat,
    pendingSubmissions: [],
    running: false,
    loadingOlder: false,
    promptError: null,
  }
}
