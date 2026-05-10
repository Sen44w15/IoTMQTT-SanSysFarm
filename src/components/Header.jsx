/**
 * Header — Logo, connection status pill, and settings button.
 */
export default function Header({ status, onOpenSettings }) {
  return (
    <header>
      <div className="logo-block">
        <div className="logo-icon">🌱</div>
        <div className="logo-text">
          <strong>SmartFarm</strong>
          <span>Supabase Reader</span>
        </div>
      </div>
      <div className="header-right">
        <div className={`status-pill ${status.state}`} id="statusPill">
          <div className="status-dot"></div>
          <span id="statusText">{status.text}</span>
        </div>
        <button className="btn-settings" id="btnOpenSettings" onClick={onOpenSettings}>
          ⚙ Settings
        </button>
      </div>
    </header>
  );
}
