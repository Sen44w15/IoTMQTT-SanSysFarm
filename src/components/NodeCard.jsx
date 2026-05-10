import { useState, useEffect, useRef } from 'react';

/**
 * MetricValue — Displays a numeric metric with a flash animation on update.
 */
function MetricValue({ value, id }) {
  const [flash, setFlash] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value !== null && value !== prevValueRef.current) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 700);
      prevValueRef.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <div className={`metric-val${flash ? ' updated' : ''}`} id={id}>
      {value !== null ? value : '—'}
    </div>
  );
}

/**
 * NodeCard — Displays sensor data for a single farm node.
 */
export default function NodeCard({ node, data }) {
  return (
    <div className={`node-card${data.active ? ' active' : ''}`} id={`card-${node.id}`}>
      <div className="node-header">
        <div>
          <div className="node-id">{node.id}</div>
          <div className="node-name">{node.emoji} {node.name}</div>
          <div className="node-loc">Metro Manila, PH</div>
        </div>
        <div className={`node-badge${data.active ? '' : ' offline'}`}>
          {data.active ? 'LIVE' : 'WAITING'}
        </div>
      </div>
      <div className="metrics">
        <div className="metric">
          <div className="metric-icon">🌡️</div>
          <MetricValue value={data.temp} id={`temp-${node.id}`} />
          <div className="metric-unit">°C</div>
          <div className="metric-label">Temp</div>
        </div>
        <div className="metric">
          <div className="metric-icon">💧</div>
          <MetricValue value={data.humidity} id={`hum-${node.id}`} />
          <div className="metric-unit">%</div>
          <div className="metric-label">Humidity</div>
        </div>
        <div className="metric">
          <div className="metric-icon">☀️</div>
          <MetricValue value={data.light} id={`ldr-${node.id}`} />
          <div className="metric-unit">lux</div>
          <div className="metric-label">Light</div>
        </div>
      </div>
      <div className="last-seen">
        {data.ts ? `Last update: ${data.ts}` : 'No data yet'}
      </div>
    </div>
  );
}
