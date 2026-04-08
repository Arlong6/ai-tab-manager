import { LIMITS } from '../shared/constants';
import { getStorage } from '../shared/storage';
import { STORAGE_KEYS } from '../shared/constants';
import type { TabInfo, TabGroup, BookmarkInfo, BookmarkFolder, BookmarkMove } from '../shared/types';

const GEMINI_MODEL = 'gemini-2.5-flash';

async function getApiKey(): Promise<string> {
  const settings = await getStorage(STORAGE_KEYS.SETTINGS);
  if (!settings?.apiKey) throw new Error('API key not set. Please add your Gemini API key in Settings.');
  return settings.apiKey;
}

function extractJson(text: string): string {
  // Remove markdown code fences
  let cleaned = text.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
  // Try to find JSON object in the text
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) cleaned = match[0];
  // Fix trailing commas (common Gemini issue)
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  return cleaned;
}

async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = await getApiKey();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.2,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 400) throw new Error('Invalid API key. Please check your Gemini API key in Settings.');
    if (response.status === 429) throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    const errMsg = (err as { error?: { message?: string } }).error?.message || response.statusText;
    throw new Error(`Gemini API error: ${errMsg}`);
  }

  const data = await response.json() as {
    candidates: { content: { parts: { text?: string; thought?: boolean }[] } }[];
  };

  // Gemini 2.5 Flash may return thinking parts — skip them, get the text part
  const parts = data.candidates[0].content.parts;
  for (const part of parts) {
    if (part.text && !part.thought) {
      return part.text;
    }
  }
  // Fallback: return last part's text
  const lastPart = parts[parts.length - 1];
  return lastPart.text || '';
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hi' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

export async function groupTabsWithAI(tabs: TabInfo[]): Promise<TabGroup[]> {
  const tabList = tabs
    .map((t) => `- Tab ${t.id}: "${t.title}" - ${t.url}`)
    .join('\n');

  const systemPrompt = `You are a tab organizer. Given a list of browser tabs, group them by topic.
Return valid JSON: { "groups": [{ "name": "Topic Name", "color": "blue", "tabIds": [1, 2, 3] }] }
Colors must be one of: ${LIMITS.TAB_COLORS.join(', ')}.
Every tab must be assigned to exactly one group. Use very short group names (1-2 words, max 12 characters). Examples: "Dev", "Social", "Work", "Shopping", "News", "Video", "Finance".`;

  const result = await callGemini(systemPrompt, `Group these tabs:\n${tabList}`);
  const json = extractJson(result);
  const parsed = JSON.parse(json) as { groups: TabGroup[] };
  // Truncate long group names to keep tab bar clean
  for (const group of parsed.groups) {
    if (group.name.length > 15) {
      group.name = group.name.slice(0, 14).trim();
    }
  }
  return parsed.groups;
}

export async function summarizeContent(text: string): Promise<string> {
  const truncated = text.slice(0, LIMITS.CONTENT_MAX_CHARS);
  // Don't use JSON mode for summaries — we want plain text
  const apiKey = await getApiKey();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: 'Summarize the following webpage content in 2-3 concise sentences. Focus on the key points.' }] },
        contents: [{ parts: [{ text: truncated }] }],
        generationConfig: { maxOutputTokens: 256, temperature: 0.2 },
      }),
    }
  );

  if (!response.ok) throw new Error('Failed to summarize');

  const data = await response.json() as {
    candidates: { content: { parts: { text?: string; thought?: boolean }[] } }[];
  };
  const parts = data.candidates[0].content.parts;
  for (const part of parts) {
    if (part.text && !part.thought) return part.text;
  }
  return parts[parts.length - 1].text || '';
}

export async function searchTabsWithAI(
  query: string,
  tabs: { tabId: number; title: string; url: string; content: string }[]
): Promise<{ tabId: number; relevance: number; snippet: string }[]> {
  const tabList = tabs
    .map((t) => `[Tab ${t.tabId}] "${t.title}" (${t.url})`)
    .join('\n');

  const systemPrompt = `You are a search assistant. Given a search query and a list of browser tabs (title and URL), rank the tabs by relevance to the query.
Return valid JSON: { "results": [{ "tabId": number, "relevance": 0-100, "snippet": "brief reason why this tab is relevant" }] }
Only include tabs with relevance > 20. Order by relevance descending.`;

  const result = await callGemini(systemPrompt, `Query: "${query}"\n\nTabs:\n${tabList}`);
  const json = extractJson(result);
  const parsed = JSON.parse(json) as { results: { tabId: number; relevance: number; snippet: string }[] };
  return parsed.results;
}

export async function organizeBookmarksWithAI(
  bookmarks: BookmarkInfo[],
  existingFolders: BookmarkFolder[]
): Promise<BookmarkMove[]> {
  const bookmarkList = bookmarks
    .map((b) => `- Bookmark "${b.id}": "${b.title}" - ${b.url}`)
    .join('\n');

  const folderList = existingFolders
    .map((f) => `- Folder "${f.id}": "${f.title}"`)
    .join('\n');

  const systemPrompt = `You are a bookmark organizer. Given a list of unfiled bookmarks and existing folders, decide where each bookmark should go.
You can assign bookmarks to existing folders OR suggest creating new folders.
Return valid JSON: { "moves": [{ "bookmarkId": "id", "targetFolderId": "folder_id_or_null", "targetFolderName": "Folder Name", "isNewFolder": false }] }
If isNewFolder is true, set targetFolderId to null and provide a good folder name.
Use existing folders when they match well. Only create new folders when no existing folder fits.
Use concise folder names (1-3 words).`;

  const userMessage = `Existing folders:\n${folderList || '(none)'}\n\nUnfiled bookmarks to organize:\n${bookmarkList}`;

  const result = await callGemini(systemPrompt, userMessage);
  const json = extractJson(result);
  const parsed = JSON.parse(json) as { moves: { bookmarkId: string; targetFolderId: string | null; targetFolderName: string; isNewFolder: boolean }[] };

  // Enrich with bookmark info
  return parsed.moves.map((m) => {
    const bk = bookmarks.find((b) => b.id === m.bookmarkId);
    return {
      ...m,
      bookmarkTitle: bk?.title || '',
      bookmarkUrl: bk?.url || '',
    };
  });
}
