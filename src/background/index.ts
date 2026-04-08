import { MessageType, STORAGE_KEYS } from '../shared/constants';
import type { Message, MessageResponse } from '../shared/messaging';
import {
  getAllTabs,
  closeTab,
  applyTabGroups,
  ungroupAll,
  groupByDomain,
  getSessions,
  saveSession,
  restoreSession,
  deleteSession,
} from './tab-manager';
import { groupTabsWithAI, summarizeContent, searchTabsWithAI, validateApiKey, organizeBookmarksWithAI } from './ai-service';
import type { BookmarkInfo, BookmarkFolder, BookmarkMove } from '../shared/types';
import { getStorage, setStorage } from '../shared/storage';

// Register all listeners synchronously at top level (MV3 requirement)
chrome.runtime.onMessage.addListener(
  (message: Message, sender: chrome.runtime.MessageSender, sendResponse: (r: MessageResponse) => void) => {
    handleMessage(message, sender).then(sendResponse).catch((err) =>
      sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) })
    );
    return true; // keep channel open for async response
  }
);

// Update badge with tab count
chrome.tabs.onCreated.addListener(updateBadge);
chrome.tabs.onRemoved.addListener(updateBadge);

// Click extension icon → open side panel directly
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// Add context menu to open side panel
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus?.create({
    id: 'open-side-panel',
    title: 'Open Side Panel',
    contexts: ['action'],
  });
});

chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open-side-panel' && tab?.windowId) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

async function updateBadge() {
  const tabs = await chrome.tabs.query({});
  chrome.action.setBadgeText({ text: tabs.length.toString() });
  chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
}

updateBadge();

async function handleMessage(message: Message, _sender: chrome.runtime.MessageSender): Promise<MessageResponse> {
  switch (message.type) {
    // Tab operations
    case MessageType.GET_TABS: {
      const tabs = await getAllTabs();
      return { success: true, data: tabs };
    }

    case MessageType.CLOSE_TAB: {
      await closeTab(message.payload as number);
      return { success: true };
    }

    case MessageType.GROUP_TABS_AI: {
      const tabs = await getAllTabs();
      const nonInternalTabs = tabs.filter((t) => t.url.startsWith('http'));
      const groups = await groupTabsWithAI(nonInternalTabs);
      await applyTabGroups(groups);
      return { success: true, data: groups };
    }

    case MessageType.GROUP_TABS_DOMAIN: {
      await groupByDomain();
      return { success: true };
    }

    case MessageType.UNGROUP_ALL: {
      await ungroupAll();
      return { success: true };
    }

    // Session operations
    case MessageType.GET_SESSIONS: {
      const sessions = await getSessions();
      return { success: true, data: sessions };
    }

    case MessageType.SAVE_SESSION: {
      const session = await saveSession(message.payload as string);
      return { success: true, data: session };
    }

    case MessageType.RESTORE_SESSION: {
      await restoreSession(message.payload as string);
      return { success: true };
    }

    case MessageType.DELETE_SESSION: {
      await deleteSession(message.payload as string);
      return { success: true };
    }

    // AI operations
    case MessageType.SUMMARIZE_TAB: {
      const { tabId } = message.payload as { tabId: number };
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => document.body.innerText,
      });
      const summary = await summarizeContent(result as string);
      return { success: true, data: summary };
    }

    case MessageType.SEARCH_TABS: {
      const { query } = message.payload as { query: string };
      const tabs = await getAllTabs();
      const httpTabs = tabs.filter((t) => t.url.startsWith('http'));

      // Search using tab titles and URLs only (no content extraction needed)
      const tabInfos = httpTabs.map((tab) => ({
        tabId: tab.id, title: tab.title, url: tab.url, content: '',
      }));

      const results = await searchTabsWithAI(query, tabInfos);
      return { success: true, data: results };
    }

    // Settings
    case MessageType.GET_SETTINGS: {
      const settings = await getStorage(STORAGE_KEYS.SETTINGS);
      return { success: true, data: settings || { apiKey: '', tier: 'free' } };
    }

    case MessageType.SET_API_KEY: {
      const apiKey = message.payload as string;
      const current = await getStorage(STORAGE_KEYS.SETTINGS);
      await setStorage(STORAGE_KEYS.SETTINGS, { ...current, apiKey, tier: current?.tier || 'free' });
      return { success: true };
    }

    case MessageType.VALIDATE_API_KEY: {
      const key = message.payload as string;
      const valid = await validateApiKey(key);
      return { success: true, data: valid };
    }

    case MessageType.OPEN_SIDE_PANEL: {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.windowId) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      }
      return { success: true };
    }

    // Bookmark operations
    case MessageType.GET_UNFILED_BOOKMARKS: {
      // Get bookmarks in the Bookmarks Bar that are NOT in any folder
      const barNodes = await chrome.bookmarks.getChildren('1'); // '1' = Bookmarks Bar
      const unfiled: BookmarkInfo[] = barNodes
        .filter((n) => n.url) // only bookmarks, not folders
        .map((n) => ({ id: n.id, title: n.title, url: n.url! }));
      return { success: true, data: unfiled };
    }

    case MessageType.GET_BOOKMARK_FOLDERS: {
      const barNodes = await chrome.bookmarks.getChildren('1');
      const folders: BookmarkFolder[] = barNodes
        .filter((n) => !n.url) // only folders
        .map((n) => ({ id: n.id, title: n.title }));
      return { success: true, data: folders };
    }

    case MessageType.ORGANIZE_BOOKMARKS_AI: {
      // Get unfiled bookmarks and existing folders, then ask AI
      const barNodes = await chrome.bookmarks.getChildren('1');
      const unfiled: BookmarkInfo[] = barNodes
        .filter((n) => n.url)
        .map((n) => ({ id: n.id, title: n.title, url: n.url! }));
      const folders: BookmarkFolder[] = barNodes
        .filter((n) => !n.url)
        .map((n) => ({ id: n.id, title: n.title }));

      if (unfiled.length === 0) {
        return { success: false, error: 'No unfiled bookmarks found in the Bookmarks Bar.' };
      }

      const moves = await organizeBookmarksWithAI(unfiled, folders);
      return { success: true, data: moves };
    }

    case MessageType.APPLY_BOOKMARK_MOVES: {
      const moves = message.payload as BookmarkMove[];
      const newFolderMap = new Map<string, string>(); // folderName -> folderId

      for (const move of moves) {
        let targetId = move.targetFolderId;

        if (move.isNewFolder) {
          // Check if we already created this folder in this batch
          if (newFolderMap.has(move.targetFolderName)) {
            targetId = newFolderMap.get(move.targetFolderName)!;
          } else {
            const newFolder = await chrome.bookmarks.create({
              parentId: '1', // Bookmarks Bar
              title: move.targetFolderName,
            });
            targetId = newFolder.id;
            newFolderMap.set(move.targetFolderName, newFolder.id);
          }
        }

        if (targetId) {
          await chrome.bookmarks.move(move.bookmarkId, { parentId: targetId });
        }
      }

      return { success: true };
    }

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}
