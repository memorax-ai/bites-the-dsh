import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SessionEvent } from '@deepseek-ai/dsh-session/types'
import type {
  ConversationLocation,
  ConversationNodeDefinition,
  ConversationViewBuilder,
  ConversationViewDefinition,
  ConversationViewNode,
} from '@deepseek-ai/dsh-client-ui-conversation/client'

export const PLAYBACK_TARGET = 'session-playback'

export interface PlaybackEntry {
  readonly event: SessionEvent
  readonly location: ConversationLocation
}

export interface PlaybackEventNode extends ConversationViewNode {
  readonly target: typeof PLAYBACK_TARGET
  readonly anchorSeq: number
  readonly data: PlaybackEntry
}

export interface PlaybackEventSnapshot {
  readonly entries: readonly PlaybackEntry[]
}

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  interface ConversationViewSnapshotMap {
    'session-playback': PlaybackEventSnapshot
  }
}

export const EMPTY_PLAYBACK_EVENTS: PlaybackEventSnapshot = Object.freeze({ entries: [] })

function isDurablePlaybackEvent(
  event: Parameters<ConversationNodeDefinition<PlaybackEntry>['match']>[0],
): event is SessionEvent {
  return event.type !== 'assistant/live-chunk'
}

const rawEventDefinition: ConversationNodeDefinition<PlaybackEntry> = {
  kind: 'session-playback.raw-event',
  target: PLAYBACK_TARGET,

  match(event) {
    if (!isDurablePlaybackEvent(event)) return null
    return {
      id: String(event.seq),
      role: 'start',
    }
  },

  start(_context, match) {
    if (!isDurablePlaybackEvent(match.event)) {
      throw new Error('Transient assistant chunks are not playback history')
    }
    return {
      event: match.event,
      location: match.location,
    }
  },

  update(context) {
    return context.state
  },

  publication(match) {
    return 'immediate'
  },

  buildViewNode(context) {
    if (context.state === undefined) return null
    return {
      key: context.key,
      kind: context.kind,
      id: context.id,
      target: PLAYBACK_TARGET,
      anchorSeq: context.state.event.seq,
      data: context.state,
    }
  },
}

class PlaybackEventBuilder implements ConversationViewBuilder<PlaybackEventNode, PlaybackEventSnapshot> {
  readonly empty = EMPTY_PLAYBACK_EVENTS
  readonly #nodes = new Map<string, PlaybackEventNode>()

  replace({ nodes }: { readonly nodes: readonly PlaybackEventNode[] }): PlaybackEventSnapshot {
    this.#nodes.clear()
    for (const node of nodes) this.#nodes.set(node.key, node)
    return this.#snapshot()
  }

  apply({ upserts }: { readonly upserts: readonly PlaybackEventNode[] }): PlaybackEventSnapshot {
    for (const node of upserts) this.#nodes.set(node.key, node)
    return this.#snapshot()
  }

  #snapshot(): PlaybackEventSnapshot {
    const entries = [...this.#nodes.values()]
      .sort((left, right) => left.anchorSeq - right.anchorSeq)
      .map((node) => node.data)
    return Object.freeze({ entries: Object.freeze(entries) })
  }
}

const rawEventView: ConversationViewDefinition<PlaybackEventNode, PlaybackEventSnapshot> = {
  target: PLAYBACK_TARGET,
  create: () => new PlaybackEventBuilder(),
}

export function registerPlaybackEvents(ctx: ClientContext): void {
  ctx.effect(
    () => ctx.uiConversation.views.register(rawEventView),
    'bites-the-dsh: raw event view',
  )
  ctx.effect(
    () => ctx.uiConversation.events.register(rawEventDefinition),
    'bites-the-dsh: raw event definition',
  )
}
