import { useState } from 'preact/hooks';
import { sendMessage } from '../../shared/messaging';
import { MessageType } from '../../shared/constants';

interface SearchResult {
  tabId: number;
  relevance: number;
  snippet: string;
}

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setResults([]);

    const res = await sendMessage<{ query: string }, SearchResult[]>(
      MessageType.SEARCH_TABS,
      { query: query.trim() }
    );

    if (res.success && res.data) {
      setResults(res.data);
    } else {
      setError(res.error || 'Search failed');
    }
    setSearching(false);
  };

  const goToTab = (tabId: number) => {
    chrome.tabs.update(tabId, { active: true });
  };

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="search"
          placeholder="Search across all tabs..."
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button class="btn-primary" onClick={handleSearch} disabled={searching || !query.trim()}>
          {searching ? '...' : 'Search'}
        </button>
      </div>

      {error && <div class="error-msg">{error}</div>}

      {searching && (
        <div class="loading"><div class="spinner" /> Searching with AI...</div>
      )}

      {!searching && results.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
            {results.length} result(s)
          </div>
          {results.map((r) => (
            <div
              key={r.tabId}
              class="card"
              style={{ marginBottom: 8, cursor: 'pointer' }}
              onClick={() => goToTab(r.tabId)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: 12 }}>Tab #{r.tabId}</div>
                <div style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  background: r.relevance > 70 ? 'var(--success)' : r.relevance > 40 ? 'var(--warning)' : 'var(--text-secondary)',
                  color: 'white',
                  borderRadius: 4,
                }}>
                  {r.relevance}%
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                {r.snippet}
              </div>
            </div>
          ))}
        </div>
      )}

      {!searching && query && results.length === 0 && !error && (
        <div class="empty-state">No results found</div>
      )}

      {!query && (
        <div class="empty-state">
          <div style={{ marginBottom: 8 }}>AI-powered search across all your open tabs</div>
          <div style={{ fontSize: 11 }}>Uses Claude to find relevant content by meaning, not just keywords</div>
        </div>
      )}
    </div>
  );
}
