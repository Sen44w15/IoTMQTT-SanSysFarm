import { useEffect, useRef } from 'react';

/**
 * LogPanel — Live MQTT message log with auto-scroll.
 */
export default function LogPanel({ logs, onClear }) {
  const bodyRef = useRef(null);

  // Auto-scroll to bottom on new log entries
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="log-panel">
      <div className="log-header">
        <span>SUPABASE STREAM</span>
        <button className="btn-clear" id="btnClearLog" onClick={onClear}>CLEAR</button>
      </div>
      <div className="log-body" id="logBody" ref={bodyRef}>
        {logs.map(entry => (
          <div key={entry.id} className={`log-entry${entry.isSys ? ' sys' : ''}`}>
            {entry.isSys ? (
              <span>{entry.ts ? `${entry.ts} — ` : ''}{entry.topic}</span>
            ) : (
              <>
                <span className="ts">{entry.ts}</span>
                <span className="topic">{entry.topic}</span>
                <span className="val">{entry.val}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
