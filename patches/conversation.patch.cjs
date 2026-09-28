const { component } = require('dsh-harmony-react')

const target = {
  package: '@deepseek-ai/dsh-client-ui-conversation',
  version: '>=0.1.5-0 <0.1.8-0',
  file: 'lib/client.js',
}

module.exports = [
  component({
    id: 'readonly-conversation-root',
    description:
      'Marks the native conversation as replaying and blocks session-mutating controls during historical playback.',
    target,
    select: { name: 'ConversationRoot' },
    expect: 1,
    operation: {
      kind: 'decorate',
      with: {
        module: '@ch4acko3/bites-the-dsh',
        export: 'decorateConversationRoot',
      },
    },
  }),
  component({
    id: 'historical-chat-projection',
    description:
      'Projects the native conversation at the replay cursor without mutating the live session.',
    target: { ...target, package: '@deepseek-ai/dsh-client-ui-chat' },
    select: { name: 'ChatView' },
    expect: 1,
    operation: {
      kind: 'decorate',
      with: {
        module: '@ch4acko3/bites-the-dsh',
        export: 'decorateChatView',
      },
    },
  }),
  component({
    id: 'readonly-native-input',
    description:
      'Keeps the native composer read-only during replay and optionally previews simulated user typing.',
    target,
    select: { name: 'InputBar' },
    expect: 1,
    operation: {
      kind: 'decorate',
      with: {
        module: '@ch4acko3/bites-the-dsh',
        export: 'decorateInputBar',
      },
    },
  }),
  component({
    id: 'readonly-native-message-actions',
    description:
      'Disables native message actions that would mutate the session during historical playback.',
    target: { ...target, package: '@deepseek-ai/dsh-client-ui-chat' },
    select: { name: 'MessageIconActions' },
    expect: 1,
    operation: {
      kind: 'decorate',
      with: {
        module: '@ch4acko3/bites-the-dsh',
        export: 'decorateMessageIconActions',
      },
    },
  }),
]
