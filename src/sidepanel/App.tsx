import { useState } from 'preact/hooks';
import { TabList } from './components/TabList';
import { SessionList } from './components/SessionList';
import { SearchBar } from './components/SearchBar';
import { Settings } from './components/Settings';

type Tab = 'tabs' | 'sessions' | 'search' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'tabs', label: 'Tabs' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'search', label: 'Search' },
  { id: 'settings', label: 'Settings' },
];

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('tabs');

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>AI Tab Manager</div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '8px 4px',
              background: 'none',
              borderRadius: 0,
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 600 : 400,
              fontSize: 12,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'tabs' && <TabList />}
        {activeTab === 'sessions' && <SessionList />}
        {activeTab === 'search' && <SearchBar />}
        {activeTab === 'settings' && <Settings />}
      </div>
    </div>
  );
}
