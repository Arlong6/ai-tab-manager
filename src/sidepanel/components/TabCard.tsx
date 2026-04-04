import { useState } from 'preact/hooks';
import { sendMessage } from '../../shared/messaging';
import { MessageType } from '../../shared/constants';
import type { TabInfo } from '../../shared/types';

interface Props {
  tab: TabInfo;
  onClose: (tabId: number) => void;
}

export function TabCard({ tab, onClose }: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const handleClick = () => {
    chrome.tabs.update(tab.id, { active: true });
    chrome.windows.update(tab.windowId, { focused: true });
  };

  const handleSummarize = async (e: Event) => {
    e.stopPropagation();
    setSummarizing(true);
    const res = await sendMessage<{ tabId: number }, string>(MessageType.SUMMARIZE_TAB, { tabId: tab.id });
    if (res.success && res.data) setSummary(res.data);
    else setSummary('Failed to summarize');
    setSummarizing(false);
  };

  const domain = (() => {
    try { return new URL(tab.url).hostname.replace('www.', ''); } catch { return ''; }
  })();

  return (
    <div
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '8px',
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
      onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
    >
      <img
        src={tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd" rx="2"/></svg>'}
        alt=""
        style={{ width: 16, height: 16, marginTop: 2, borderRadius: 2, flexShrink: 0 }}
        onError={(e) => (e.currentTarget as HTMLImageElement).style.display = 'none'}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: tab.active ? 600 : 400,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {tab.title}
        </div>
        <div style={{
          fontSize: 11,
          color: 'var(--text-secondary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {domain}
        </div>

        {summarizing && (
          <div class="loading" style={{ padding: '4px 0', fontSize: 11 }}>
            <div class="spinner" style={{ width: 12, height: 12 }} /> Summarizing...
          </div>
        )}
        {summary && (
          <div style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            marginTop: 4,
            padding: 6,
            background: 'var(--bg-secondary)',
            borderRadius: 4,
            lineHeight: 1.4,
          }}>
            {summary}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
        {tab.url.startsWith('http') && (
          <button class="btn-icon" onClick={handleSummarize} disabled={summarizing} title="Summarize">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
              <path d="M10 9H8" />
            </svg>
          </button>
        )}
        <button
          class="btn-icon"
          onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
          title="Close tab"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
