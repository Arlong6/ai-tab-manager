export interface TabInfo {
  id: number;
  windowId: number;
  url: string;
  title: string;
  favIconUrl?: string;
  pinned: boolean;
  groupId: number;
  active: boolean;
}

export interface TabGroup {
  name: string;
  color: string;
  tabIds: number[];
}

export interface SavedTab {
  url: string;
  title: string;
  favIconUrl?: string;
  groupName?: string;
}

export interface SavedGroup {
  name: string;
  color: string;
}

export interface Session {
  id: string;
  name: string;
  createdAt: number;
  tabs: SavedTab[];
  groups: SavedGroup[];
}

export interface Settings {
  apiKey: string;
  tier: 'free' | 'pro';
}

export interface TabSummary {
  tabId: number;
  url: string;
  summary: string;
  cachedAt: number;
}

export interface SearchResult {
  tabId: number;
  title: string;
  url: string;
  snippet: string;
  relevance: number;
}
