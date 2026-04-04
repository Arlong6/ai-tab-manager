import { useState, useEffect } from 'preact/hooks';
import { sendMessage } from '../../shared/messaging';
import { MessageType } from '../../shared/constants';
import type { Session } from '../../shared/types';

export function SessionList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    const res = await sendMessage<void, Session[]>(MessageType.GET_SESSIONS);
    if (res.success && res.data) setSessions(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, []);

  const handleSave = async () => {
    const name = prompt('Session name:');
    if (!name) return;
    setSaving(true);
    setError(null);
    const res = await sendMessage(MessageType.SAVE_SESSION, name);
    if (!res.success) setError(res.error || 'Failed to save');
    setSaving(false);
    fetchSessions();
  };

  const handleRestore = async (id: string) => {
    const res = await sendMessage(MessageType.RESTORE_SESSION, id);
    if (!res.success) setError(res.error || 'Failed to restore');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this session?')) return;
    await sendMessage(MessageType.DELETE_SESSION, id);
    fetchSessions();
  };

  if (loading) {
    return <div class="loading"><div class="spinner" /> Loading sessions...</div>;
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sessions.length} session(s)</span>
        <button class="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Current'}
        </button>
      </div>

      {error && <div class="error-msg">{error}</div>}

      {sessions.length === 0 ? (
        <div class="empty-state">
          <div style={{ fontSize: 24, marginBottom: 8 }}>No saved sessions</div>
          <div>Save your current tabs as a session to restore them later.</div>
        </div>
      ) : (
        sessions.sort((a, b) => b.createdAt - a.createdAt).map((session) => (
          <div key={session.id} class="card" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{session.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {session.tabs.length} tabs
                  {session.groups.length > 0 && ` \u00B7 ${session.groups.length} groups`}
                  {' \u00B7 '}
                  {new Date(session.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button class="btn-secondary" onClick={() => handleRestore(session.id)} style={{ fontSize: 11, padding: '4px 8px' }}>
                  Restore
                </button>
                <button class="btn-icon" onClick={() => handleDelete(session.id)} title="Delete" style={{ color: 'var(--danger)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Tab preview */}
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {session.tabs.slice(0, 5).map((tab, i) => (
                <span key={i} style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 4,
                  color: 'var(--text-secondary)',
                  maxWidth: 120,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {tab.title}
                </span>
              ))}
              {session.tabs.length > 5 && (
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', padding: '2px 4px' }}>
                  +{session.tabs.length - 5} more
                </span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
