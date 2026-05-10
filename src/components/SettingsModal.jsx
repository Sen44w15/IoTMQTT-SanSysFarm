import { useState } from 'react';

/**
 * SettingsModal — Broker connection settings overlay.
 */
export default function SettingsModal({ isOpen, onClose, onConnect }) {
  const [url, setUrl] = useState(import.meta.env.VITE_SUPABASE_URL || '');
  const [key, setKey] = useState(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
  const [table, setTable] = useState(import.meta.env.VITE_SUPABASE_TABLE || 'sensor_logs');
  const [pollMs, setPollMs] = useState(import.meta.env.VITE_SUPABASE_POLL_MS || '5000');

  const handleConnect = () => {
    if (!url.trim() || !key.trim()) {
      alert('Please enter your Supabase URL and anon key.');
      return;
    }

    onConnect(url.trim(), key.trim(), table.trim() || 'sensor_logs', pollMs.trim() || '5000');
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className={`modal-overlay${isOpen ? ' open' : ''}`}
      id="modalOverlay"
      onClick={handleOverlayClick}
    >
      <div className="modal">
        <h2>Supabase Settings</h2>
        <p>Connect this dashboard to your Supabase table.</p>

        <div className="field">
          <label>SUPABASE URL</label>
          <input
            type="text"
            id="inpSupabaseUrl"
            placeholder="https://your-project.supabase.co"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
        </div>
        <div className="field">
          <label>ANON KEY</label>
          <input
            type="password"
            id="inpAnonKey"
            placeholder="eyJhbGciOi..."
            value={key}
            onChange={e => setKey(e.target.value)}
          />
        </div>
        <div className="field">
          <label>TABLE NAME</label>
          <input
            type="text"
            id="inpTable"
            value={table}
            onChange={e => setTable(e.target.value)}
          />
        </div>
        <div className="field">
          <label>
            POLL INTERVAL MS <span style={{ opacity: 0.5, fontSize: '0.65rem' }}>(e.g. 5000)</span>
          </label>
          <input
            type="text"
            id="inpPollMs"
            placeholder="5000"
            value={pollMs}
            onChange={e => setPollMs(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button className="btn-primary" id="btnConnect" onClick={handleConnect}>
            Connect
          </button>
          <button className="btn-secondary" id="btnCloseModal" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
