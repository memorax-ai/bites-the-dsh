import type { ComponentType, ReactNode } from 'react'
import { createContext, useContext, useMemo, useRef, useSyncExternalStore } from 'react'
import type {
  ConversationSlotProps,
  ConversationSnapshot as NativeConversationSnapshot,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ChatViewSlotProps } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PlaybackSnapshot as ConversationSnapshot } from './playback-snapshot.js'
import type { PlaybackState } from './playback-controller.js'
import {
  playbackEventsOf,
  projectConversationSnapshotAtCursor,
} from './playback-projection.js'
import { withConversationPlaybackClock } from './projection-clock.js'
import { playbackController } from './runtime.js'
import { bindProjectedSession, bindProjectedKeyedHook } from './session-hook.js'
import {
  bindSimulatedInput,
  type MaybeInputHook,
  simulatedDraftAtTime,
  simulatedInputPreview,
} from './simulated-input.js'

type ConversationRootRuntimeProps = ConversationSlotProps & {
  sessionId: SessionId | undefined
}

const NO_SESSION_PLAYBACK_KEY = '__bites-the-dsh:no-session__'
const HistoricalPlaybackContext = createContext(false)

function useSessionPlayback(sessionId: SessionId | undefined): PlaybackState {
  const store = useMemo(
    () => playbackController.storeFor(sessionId ?? NO_SESSION_PLAYBACK_KEY),
    [sessionId],
  )
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

type InputBarRuntimeProps = Record<string, unknown> & {
  disabled?: boolean
  sessionId?: SessionId
  useInput: MaybeInputHook
  useConversation: <Selected>(selector: (state: NativeConversationSnapshot) => Selected) => Selected | undefined
}

type MessageIconActionsRuntimeProps = Record<string, unknown> & {
  onBranch?: () => void
  extraActions?: ReactNode
}

export function decorateConversationRoot(Original: ComponentType<ConversationSlotProps>) {
  return function PlaybackConversationRoot(props: ConversationSlotProps) {
    const { sessionId } = props as ConversationRootRuntimeProps
    const playback = useSessionPlayback(sessionId)
    const active = sessionId !== undefined && playback.mode !== 'live'

    return <HistoricalPlaybackContext.Provider value={active}>
      <div
        style={{ display: 'contents' }}
        data-session-playback-readonly={active || undefined}
      >
        <Original {...props} />
      </div>
    </HistoricalPlaybackContext.Provider>
  }
}

export function decorateInputBar(Original: ComponentType<InputBarRuntimeProps>) {
  return function PlaybackInputBar(props: InputBarRuntimeProps) {
    const historical = useContext(HistoricalPlaybackContext)
    // Native slots can render before our standard-props contribution activates.
    // The decorators share the controller directly throughout that interval.
    const playback = useSessionPlayback(props.sessionId)
    const entries = props.useConversation((snapshot) => playbackEventsOf(snapshot).entries) ?? []
    const simulatedPreview = useMemo(
      () => historical && playback?.simulateTyping
        ? simulatedInputPreview(entries, playback)
        : undefined,
      [entries, historical, playback?.cursorSeq, playback?.simulateTyping, playback?.skipIdle],
    )
    const simulatedDraft = historical && playback?.simulateTyping
      ? simulatedDraftAtTime(simulatedPreview, playback.cursorTime)
      : undefined
    const useInput = useMemo(
      () => simulatedDraft === undefined
        ? props.useInput
        : bindSimulatedInput(props.useInput, simulatedDraft),
      [props.useInput, simulatedDraft],
    )

    return <Original
      {...props}
      useInput={useInput}
      disabled={historical || props.disabled}
    />
  }
}

export function decorateMessageIconActions(Original: ComponentType<MessageIconActionsRuntimeProps>) {
  return function PlaybackMessageIconActions(props: MessageIconActionsRuntimeProps) {
    const historical = useContext(HistoricalPlaybackContext)
    return <Original
      {...props}
      onBranch={historical ? undefined : props.onBranch}
      extraActions={historical ? null : props.extraActions}
    />
  }
}

export function decorateChatView(Original: ComponentType<ChatViewSlotProps>) {
  return function PlaybackChatView(props: ChatViewSlotProps) {
    const playback = useSessionPlayback(props.sessionId)
    const session = props.useSession((value) => value)
    const conversation = props.useConversation((value) => value)
    const chat = props.useChat((value) => value)
    const liveSnapshot = useMemo(() => ({ ...session, ...conversation, chat }), [session, conversation, chat])
    const projectionCache = useRef<{
      cursorSeq: number
      hasMore: boolean
      count: number
      firstSeq: number | undefined
      firstTime: number | undefined
      lastSeq: number | undefined
      lastTime: number | undefined
      snapshot: ConversationSnapshot
    } | undefined>(undefined)
    const projectedAtCursor = useMemo(
      () => {
        if (playback.mode === 'live') {
          projectionCache.current = undefined
          return liveSnapshot
        }
        const entries = playbackEventsOf(liveSnapshot).entries
        let lower = 0
        let upper = entries.length
        while (lower < upper) {
          const middle = Math.floor((lower + upper) / 2)
          if (entries[middle]!.event.seq <= playback.cursorSeq) lower = middle + 1
          else upper = middle
        }
        const first = entries[0]?.event
        const last = entries[lower - 1]?.event
        const cached = projectionCache.current
        if (
          cached?.cursorSeq === playback.cursorSeq
          && cached.hasMore === liveSnapshot.hasMore
          && cached.count === lower
          && cached.firstSeq === first?.seq
          && cached.firstTime === first?.time
          && cached.lastSeq === last?.seq
          && cached.lastTime === last?.time
        ) return cached.snapshot

        const snapshot = projectConversationSnapshotAtCursor(liveSnapshot, playback.cursorSeq)
        projectionCache.current = {
          cursorSeq: playback.cursorSeq,
          hasMore: liveSnapshot.hasMore,
          count: lower,
          firstSeq: first?.seq,
          firstTime: first?.time,
          lastSeq: last?.seq,
          lastTime: last?.time,
          snapshot,
        }
        return snapshot
      },
      [liveSnapshot, playback.mode, playback.cursorSeq],
    )
    const projected = useMemo(
      () => playback.mode === 'live'
        ? liveSnapshot
        : withConversationPlaybackClock(projectedAtCursor, playback.cursorTime),
      [liveSnapshot, playback.mode, playback.cursorTime, projectedAtCursor],
    )
    const useProjectedSession = useMemo(
      () => bindProjectedSession(props.useSession, projected),
      [projected, props.useSession],
    )
    const historical = playback.mode !== 'live'
    const useChat: ChatViewSlotProps['useChat'] = selector => {
      props.useChat(selector)
      return selector(projected.chat)
    }
    const useChatNode = bindProjectedKeyedHook(props.useChatNode, key => projected.chat.nodes.get(key))
    const useChatNodeProcess = bindProjectedKeyedHook(props.useChatNodeProcess, key => projected.chat.nodes.processSource(key).getSnapshot())
    const useProjection = ((key: string, selector?: (value: undefined) => unknown) => {
      props.useProjection(key as never)
      return selector?.(undefined)
    }) as ChatViewSlotProps['useProjection']

    return <Original
      {...props}
      useSession={playback.mode === 'live' ? props.useSession : useProjectedSession}
      useChat={historical ? useChat : props.useChat}
      useChatNode={historical ? useChatNode : props.useChatNode}
      useChatNodeProcess={historical ? useChatNodeProcess : props.useChatNodeProcess}
      useProjection={historical ? useProjection : props.useProjection}
    />
  }
}
