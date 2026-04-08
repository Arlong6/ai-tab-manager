import { STORAGE_KEYS, LIMITS } from '../shared/constants';
import { getStorage, setStorage } from '../shared/storage';
import type { TabInfo, Session, SavedTab, SavedGroup, TabGroup } from '../shared/types';

export async function getAllTabs(): Promise<TabInfo[]> {
  const tabs = await chrome.tabs.query({});
  return tabs.map((t) => ({
    id: t.id!,
    windowId: t.windowId,
    url: t.url || '',
    title: t.title || 'Untitled',
    favIconUrl: t.favIconUrl,
    pinned: t.pinned,
    groupId: t.groupId,
    active: t.active,
  }));
}

export async function closeTab(tabId: number): Promise<void> {
  await chrome.tabs.remove(tabId);
}

export async function applyTabGroups(groups: TabGroup[]): Promise<void> {
  for (const group of groups) {
    if (group.tabIds.length === 0) continue;
    const groupId = await chrome.tabs.group({ tabIds: group.tabIds as [number, ...number[]] });
    await chrome.tabGroups.update(groupId as number, {
      title: group.name,
      color: group.color as chrome.tabGroups.Color,
    });
  }
}

export async function ungroupAll(): Promise<void> {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
      await chrome.tabs.ungroup(tab.id);
    }
  }
}

/** Shorten a domain to a readable label (e.g. "boards.greenhouse.io" → "Greenhouse") */
function shortenDomain(domain: string): string {
  // Remove common subdomains
  const cleaned = domain.replace(/^(www|boards|jobs|job-boards|app|api|mail|m)\./i, '');
  // Extract the main part (second-level domain)
  const parts = cleaned.split('.');
  // For domains like "github.com" → "GitHub", "youtube.com" → "YouTube"
  const main = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  // Capitalize first letter
  return main.charAt(0).toUpperCase() + main.slice(1);
}

export async function groupByDomain(): Promise<void> {
  const tabs = await getAllTabs();
  const domainMap = new Map<string, number[]>();

  for (const tab of tabs) {
    try {
      const domain = new URL(tab.url).hostname.replace('www.', '');
      if (!domainMap.has(domain)) domainMap.set(domain, []);
      domainMap.get(domain)!.push(tab.id);
    } catch {
      // skip invalid URLs (chrome://, about:, etc.)
    }
  }

  const colors = LIMITS.TAB_COLORS;
  let colorIndex = 0;

  for (const [domain, tabIds] of domainMap) {
    if (tabIds.length < 2) continue;
    const groupId = await chrome.tabs.group({ tabIds: tabIds as [number, ...number[]] });
    await chrome.tabGroups.update(groupId as number, {
      title: shortenDomain(domain),
      color: colors[colorIndex % colors.length] as chrome.tabGroups.Color,
    });
    colorIndex++;
  }
}

// Session management

export async function getSessions(): Promise<Session[]> {
  return (await getStorage(STORAGE_KEYS.SESSIONS)) || [];
}

export async function saveSession(name: string): Promise<Session> {
  const sessions = await getSessions();
  const settings = await getStorage(STORAGE_KEYS.SETTINGS);
  const tier = settings?.tier || 'free';

  if (tier === 'free' && sessions.length >= LIMITS.FREE_MAX_SESSIONS) {
    throw new Error(`Free tier limited to ${LIMITS.FREE_MAX_SESSIONS} sessions. Upgrade to Pro for unlimited.`);
  }

  const tabs = await chrome.tabs.query({});
  const tabGroupsMap = new Map<number, chrome.tabGroups.TabGroup>();

  // Collect group info
  for (const tab of tabs) {
    if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && !tabGroupsMap.has(tab.groupId)) {
      try {
        const group = await chrome.tabGroups.get(tab.groupId);
        tabGroupsMap.set(tab.groupId, group);
      } catch {
        // group may have been removed
      }
    }
  }

  const savedTabs: SavedTab[] = tabs.map((t) => ({
    url: t.url || '',
    title: t.title || 'Untitled',
    favIconUrl: t.favIconUrl,
    groupName: t.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE
      ? tabGroupsMap.get(t.groupId)?.title
      : undefined,
  }));

  const savedGroups: SavedGroup[] = [...tabGroupsMap.values()].map((g) => ({
    name: g.title || 'Unnamed',
    color: g.color,
  }));

  const session: Session = {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    tabs: savedTabs,
    groups: savedGroups,
  };

  sessions.push(session);
  await setStorage(STORAGE_KEYS.SESSIONS, sessions);
  return session;
}

export async function restoreSession(sessionId: string): Promise<void> {
  const sessions = await getSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error('Session not found');

  // Open all tabs
  const groupTabMap = new Map<string, number[]>();

  for (const tab of session.tabs) {
    const newTab = await chrome.tabs.create({ url: tab.url, active: false });
    if (tab.groupName && newTab.id) {
      if (!groupTabMap.has(tab.groupName)) groupTabMap.set(tab.groupName, []);
      groupTabMap.get(tab.groupName)!.push(newTab.id);
    }
  }

  // Restore groups
  for (const group of session.groups) {
    const tabIds = groupTabMap.get(group.name);
    if (tabIds && tabIds.length > 0) {
      const groupId = await chrome.tabs.group({ tabIds: tabIds as [number, ...number[]] });
      await chrome.tabGroups.update(groupId as number, {
        title: group.name,
        color: group.color as chrome.tabGroups.Color,
      });
    }
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  const sessions = await getSessions();
  const filtered = sessions.filter((s) => s.id !== sessionId);
  await setStorage(STORAGE_KEYS.SESSIONS, filtered);
}
