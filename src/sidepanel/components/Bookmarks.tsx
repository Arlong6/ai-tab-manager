import { useState } from 'preact/hooks';
import { sendMessage } from '../../shared/messaging';
import { MessageType } from '../../shared/constants';
import type { BookmarkMove } from '../../shared/types';

export function Bookmarks() {
  const [moves, setMoves] = useState<BookmarkMove[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Store last applied moves for undo — each move remembers its original parent
  const [lastApplied, setLastApplied] = useState<BookmarkMove[] | null>(null);

  const handleOrganize = async () => {
    setLoading(true);
    setError(null);
    setMoves([]);
    setDone(false);
    setLastApplied(null);

    const res = await sendMessage<void, BookmarkMove[]>(MessageType.ORGANIZE_BOOKMARKS_AI);
    if (res.success && res.data) {
      setMoves(res.data);
    } else {
      setError(res.error || 'Failed to analyze bookmarks');
    }
    setLoading(false);
  };

  const handleRemove = (bookmarkId: string) => {
    setMoves((prev) => prev.filter((m) => m.bookmarkId !== bookmarkId));
  };

  const handleApply = async () => {
    if (moves.length === 0) return;
    setApplying(true);
    setError(null);

    const res = await sendMessage(MessageType.APPLY_BOOKMARK_MOVES, moves);
    if (res.success) {
      setLastApplied(moves);
      setDone(true);
      setMoves([]);
    } else {
      setError(res.error || 'Failed to move bookmarks');
    }
    setApplying(false);
  };

  const handleUndo = async () => {
    if (!lastApplied) return;
    setUndoing(true);
    setError(null);

    // Move all bookmarks back to Bookmarks Bar (parentId '1')
    const undoMoves: BookmarkMove[] = lastApplied.map((m) => ({
      ...m,
      targetFolderId: '1',
      targetFolderName: 'Bookmarks Bar',
      isNewFolder: false,
    }));

    const res = await sendMessage(MessageType.APPLY_BOOKMARK_MOVES, undoMoves);
    if (res.success) {
      setLastApplied(null);
      setDone(false);
    } else {
      setError(res.error || 'Failed to undo');
    }
    setUndoing(false);
  };

  // Group moves by target folder for display
  const grouped = new Map<string, BookmarkMove[]>();
  for (const move of moves) {
    const key = move.targetFolderName;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(move);
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 12 }}>
        <button class="btn-primary" onClick={handleOrganize} disabled={loading} style={{ width: '100%', padding: '10px 16px', fontSize: 13 }}>
          {loading ? 'Analyzing bookmarks...' : 'AI Organize Bookmarks'}
        </button>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
          Analyzes unfiled bookmarks in your Bookmarks Bar and suggests folders
        </div>
      </div>

      {error && <div class="error-msg">{error}</div>}

      {loading && (
        <div class="loading"><div class="spinner" /> Asking AI to categorize your bookmarks...</div>
      )}

      {done && (
        <div>
          <div style={{ padding: 12, background: 'var(--primary-light)', borderRadius: 'var(--radius)', color: 'var(--success)', fontSize: 13, marginBottom: 8 }}>
            Bookmarks organized successfully!
          </div>
          {lastApplied && (
            <button
              class="btn-danger"
              onClick={handleUndo}
              disabled={undoing}
              style={{ width: '100%', padding: '10px 16px', fontSize: 13 }}
            >
              {undoing ? 'Undoing...' : 'Undo — Move All Back'}
            </button>
          )}
        </div>
      )}

      {moves.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              Preview — {moves.length} bookmark(s) to organize
            </div>
          </div>

          {[...grouped.entries()].map(([folderName, folderMoves]) => (
            <div key={folderName} class="card" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{folderName}</span>
                {folderMoves[0].isNewFolder && (
                  <span style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    background: 'var(--primary)',
                    color: 'white',
                    borderRadius: 4,
                  }}>
                    NEW
                  </span>
                )}
              </div>

              {folderMoves.map((move) => (
                <div key={move.bookmarkId} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  fontSize: 12,
                  borderRadius: 4,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {move.bookmarkTitle}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {move.bookmarkUrl}
                    </div>
                  </div>
                  <button
                    class="btn-icon"
                    onClick={() => handleRemove(move.bookmarkId)}
                    title="Remove from list"
                    style={{ color: 'var(--danger)', flexShrink: 0 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              class="btn-primary"
              onClick={handleApply}
              disabled={applying}
              style={{ flex: 1, padding: '10px 16px', fontSize: 13 }}
            >
              {applying ? 'Moving...' : `Confirm & Move (${moves.length})`}
            </button>
            <button
              class="btn-secondary"
              onClick={() => setMoves([])}
              style={{ padding: '10px 16px', fontSize: 13 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!loading && moves.length === 0 && !done && (
        <div class="empty-state">
          <div style={{ marginBottom: 8 }}>Click the button above to analyze your bookmarks</div>
          <div style={{ fontSize: 11 }}>AI will suggest folders for unfiled bookmarks in your Bookmarks Bar. You can review and remove items before confirming.</div>
        </div>
      )}
    </div>
  );
}
