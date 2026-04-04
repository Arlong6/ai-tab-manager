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
import { groupTabsWithAI, summarizeContent, searchTabsWithAI, validateApiKey } from './ai-service';
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

// Enable side panel
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});

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

      // Extract content from all tabs
      const tabContents = await Promise.all(
        httpTabs.map(async (tab) => {
          try {
            const [{ result }] = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => document.body.innerText,
            });
            return { tabId: tab.id, title: tab.title, url: tab.url, content: (result as string) || '' };
          } catch {
            return { tabId: tab.id, title: tab.title, url: tab.url, content: '' };
          }
        })
      );

      const results = await searchTabsWithAI(query, tabContents.filter((t) => t.content));
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
      // Open side panel - requires a windowId
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.windowId) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      }
      return { success: true };
    }

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}
