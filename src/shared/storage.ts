import { STORAGE_KEYS } from './constants';
import type { Session, Settings, TabSummary } from './types';

type StorageMap = {
  [STORAGE_KEYS.SESSIONS]: Session[];
  [STORAGE_KEYS.SETTINGS]: Settings;
  [STORAGE_KEYS.SUMMARY_CACHE]: Record<string, TabSummary>;
};

export async function getStorage<K extends keyof StorageMap>(
  key: K
): Promise<StorageMap[K] | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key] as StorageMap[K] | undefined;
}

export async function setStorage<K extends keyof StorageMap>(
  key: K,
  value: StorageMap[K]
): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}
