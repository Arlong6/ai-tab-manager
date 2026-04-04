import { useState, useEffect } from 'preact/hooks';
import { sendMessage } from '../../shared/messaging';
import { MessageType } from '../../shared/constants';
import type { Settings as SettingsType } from '../../shared/types';

export function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'valid' | 'invalid' | 'saved'>('idle');

  useEffect(() => {
    sendMessage<void, SettingsType>(MessageType.GET_SETTINGS).then((res) => {
      if (res.success && res.data) {
        setApiKey(res.data.apiKey || '');
        if (res.data.apiKey) setStatus('saved');
      }
    });
  }, []);

  const handleValidate = async () => {
    if (!apiKey.trim()) return;
    setValidating(true);
    const res = await sendMessage<string, boolean>(MessageType.VALIDATE_API_KEY, apiKey.trim());
    setStatus(res.success && res.data ? 'valid' : 'invalid');
    setValidating(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await sendMessage(MessageType.SET_API_KEY, apiKey.trim());
    setStatus('saved');
    setSaving(false);
  };

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ fontSize: 14, marginBottom: 16 }}>Settings</h3>

      {/* API Key */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
          Gemini API Key
        </label>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>
          Get your API key from{' '}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener"
            style={{ color: 'var(--primary)' }}
          >
            aistudio.google.com
          </a>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onInput={(e) => { setApiKey((e.target as HTMLInputElement).value); setStatus('idle'); }}
              placeholder="AIza..."
            />
          </div>
          <button class="btn-secondary" onClick={() => setShowKey(!showKey)} style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button class="btn-secondary" onClick={handleValidate} disabled={validating || !apiKey.trim()}>
            {validating ? 'Checking...' : 'Validate'}
          </button>
          <button class="btn-primary" onClick={handleSave} disabled={saving || !apiKey.trim()}>
            {saving ? 'Saving...' : 'Save Key'}
          </button>
        </div>

        {status === 'valid' && (
          <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 8 }}>API key is valid</div>
        )}
        {status === 'invalid' && (
          <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8 }}>Invalid API key. Please check and try again.</div>
        )}
        {status === 'saved' && (
          <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 8 }}>Key saved</div>
        )}
      </div>

      {/* Info */}
      <div class="card" style={{ background: 'var(--bg-secondary)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>About</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          AI Tab Manager uses Gemini AI to intelligently organize your tabs.
          Your API key is stored locally and never sent to any server except Google's API.
          <br /><br />
          <strong>Free tier:</strong> 3 saved sessions
          <br />
          <strong>AI features:</strong> Requires your own Gemini API key (free tier available!)
        </div>
      </div>

      {/* Version */}
      <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center' }}>
        AI Tab Manager v0.1.0
      </div>
    </div>
  );
}
