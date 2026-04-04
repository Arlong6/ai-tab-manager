import { useState, useEffect, useCallback } from 'preact/hooks';
import { sendMessage } from '../../shared/messaging';
import { MessageType } from '../../shared/constants';
import type { TabInfo } from '../../shared/types';
import { TabCard } from './TabCard';

export function TabList() {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [grouping, setGrouping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTabs = useCallback(async () => {
    const res = await sendMessage<void, TabInfo[]>(MessageType.GET_TABS);
    if (res.success && res.data) setTabs(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTabs();

    // Listen for tab changes
    const listener = () => fetchTabs();
    chrome.tabs.onCreated.addListener(listener);
    chrome.tabs.onRemoved.addListener(listener);
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabGroups?.onUpdated?.addListener(listener);

    return () => {
      chrome.tabs.onCreated.removeListener(listener);
      chrome.tabs.onRemoved.removeListener(listener);
      chrome.tabs.onUpdated.removeListener(listener);
      chrome.tabGroups?.onUpdated?.removeListener(listener);
    };
  }, [fetchTabs]);

  const handleAIGroup = async () => {
    setGrouping(true);
    setError(null);
    const res = await sendMessage(MessageType.GROUP_TABS_AI);
    if (!res.success) setError(res.error || 'AI grouping failed');
    setGrouping(false);
    fetchTabs();
  };

  const handleDomainGroup = async () => {
    setGrouping(true);
    await sendMessage(MessageType.GROUP_TABS_DOMAIN);
    setGrouping(false);
    fetchTabs();
  };

  const handleUngroup = async () => {
    await sendMessage(MessageType.UNGROUP_ALL);
    fetchTabs();
  };

  const handleClose = async (tabId: number) => {
    await sendMessage(MessageType.CLOSE_TAB, tabId);
    fetchTabs();
  };

  if (loading) {
    return <div class="loading"><div class="spinner" /> Loading tabs...</div>;
  }

  // Group tabs by their groupId for display
  const grouped = new Map<number, { name: string; color: string; tabs: TabInfo[] }>();
  const ungrouped: TabInfo[] = [];

  for (const tab of tabs) {
    if (tab.groupId === -1) {
      ungrouped.push(tab);
    } else {
      if (!grouped.has(tab.groupId)) {
        grouped.set(tab.groupId, { name: '', color: 'grey', tabs: [] });
      }
      grouped.get(tab.groupId)!.tabs.push(tab);
    }
  }

  // Fetch group info
  useEffect(() => {
    grouped.forEach(async (group, groupId) => {
      try {
        const info = await chrome.tabGroups.get(groupId);
        group.name = info.title || 'Unnamed';
        group.color = info.color;
        setTabs((t) => [...t]); // trigger re-render
      } catch { /* group may not exist */ }
    });
  }, [tabs.map((t) => t.groupId).join(',')]);

  return (
    <div style={{ padding: 12 }}>
      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <button class="btn-primary" onClick={handleAIGroup} disabled={grouping}>
          {grouping ? 'Grouping...' : 'AI Group'}
        </button>
        <button class="btn-secondary" onClick={handleDomainGroup} disabled={grouping}>
          By Domain
        </button>
        <button class="btn-secondary" onClick={handleUngroup}>
          Ungroup
        </button>
        <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: 12, alignSelf: 'center' }}>
          {tabs.length} tabs
        </span>
      </div>

      {error && <div class="error-msg">{error}</div>}

      {/* Grouped tabs */}
      {[...grouped.entries()].map(([groupId, group]) => (
        <div key={groupId} style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            padding: '4px 8px',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius)',
            marginBottom: 4,
          }}>
            {group.name || 'Group'} ({group.tabs.length})
          </div>
          {group.tabs.map((tab) => (
            <TabCard key={tab.id} tab={tab} onClose={handleClose} />
          ))}
        </div>
      ))}

      {/* Ungrouped tabs */}
      {ungrouped.length > 0 && (
        <div>
          {grouped.size > 0 && (
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              padding: '4px 8px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius)',
              marginBottom: 4,
            }}>
              Ungrouped ({ungrouped.length})
            </div>
          )}
          {ungrouped.map((tab) => (
            <TabCard key={tab.id} tab={tab} onClose={handleClose} />
          ))}
        </div>
      )}
    </div>
  );
}
