import { useState } from 'preact/hooks';
import { sendMessage } from '../shared/messaging';
import { MessageType } from '../shared/constants';

export function Popup() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: string, type: MessageType, payload?: unknown) => {
    setLoading(action);
    setError(null);
    try {
      const res = await sendMessage(type, payload);
      if (!res.success) setError(res.error || 'Action failed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ width: 280, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ fontSize: 18 }}>AI Tab Manager</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          class="btn-primary"
          disabled={loading !== null}
          onClick={() => handleAction('ai-group', MessageType.GROUP_TABS_AI)}
          style={{ padding: '10px 16px', fontSize: 13 }}
        >
          {loading === 'ai-group' ? 'Grouping...' : 'AI Auto-Group Tabs'}
        </button>

        <button
          class="btn-secondary"
          disabled={loading !== null}
          onClick={() => handleAction('domain-group', MessageType.GROUP_TABS_DOMAIN)}
          style={{ padding: '10px 16px', fontSize: 13 }}
        >
          {loading === 'domain-group' ? 'Grouping...' : 'Group by Domain'}
        </button>

        <button
          class="btn-secondary"
          disabled={loading !== null}
          onClick={() => handleAction('ungroup', MessageType.UNGROUP_ALL)}
          style={{ padding: '10px 16px', fontSize: 13 }}
        >
          Ungroup All
        </button>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />

        <button
          class="btn-secondary"
          disabled={loading !== null}
          onClick={() => {
            const name = prompt('Session name:');
            if (name) handleAction('save', MessageType.SAVE_SESSION, name);
          }}
          style={{ padding: '10px 16px', fontSize: 13 }}
        >
          {loading === 'save' ? 'Saving...' : 'Save Session'}
        </button>

        <button
          class="btn-secondary"
          onClick={() => sendMessage(MessageType.OPEN_SIDE_PANEL)}
          style={{ padding: '10px 16px', fontSize: 13 }}
        >
          Open Side Panel
        </button>
      </div>

      {error && <div class="error-msg" style={{ marginTop: 8 }}>{error}</div>}
    </div>
  );
}
