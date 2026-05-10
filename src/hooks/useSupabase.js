import { useCallback, useEffect, useRef, useState } from 'react';
import { NODES } from '../data/nodes';

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return now();
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function buildInitialNodeData() {
  const data = {};
  NODES.forEach(node => {
    data[node.id] = { temp: null, humidity: null, light: null, ts: null, active: false };
  });
  return data;
}

function buildInitialLogs() {
  return [{ id: 0, ts: '', topic: '— Waiting for Supabase data —', val: '', isSys: true }];
}

function normalizeRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(row => ({
    sensor_id: row.sensor_id ?? '',
    location: row.location ?? '',
    temperature: row.temperature,
    humidity: row.humidity,
    ldr_raw: row.ldr_raw,
    daytime: row.daytime,
    timestamp: row.created_at ?? row.timestamp ?? row.inserted_at ?? '',
  }));
}

function matchNode(row) {
  const sensorId = String(row.sensor_id || '').trim().toLowerCase();
  const location = String(row.location || '').trim().toLowerCase();

  for (const node of NODES) {
    if (sensorId === node.id.toLowerCase()) return node.id;
    if (node.keywords.some(keyword => sensorId.includes(keyword) || location.includes(keyword))) return node.id;
  }

  return null;
}

export function useSupabase() {
  const [status, setStatus] = useState({ state: '', text: 'Disconnected' });
  const [nodeData, setNodeData] = useState(buildInitialNodeData);
  const [logs, setLogs] = useState(buildInitialLogs);
  const clientRef = useRef({ timerId: null, config: null, requestId: 0 });

  const addLog = useCallback((ts, topic, val, isSys = false) => {
    setLogs(prev => {
      const next = [...prev, { id: Date.now() + Math.random(), ts, topic, val, isSys }];
      return next.length > 80 ? next.slice(next.length - 80) : next;
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const disconnect = useCallback(() => {
    if (clientRef.current.timerId) {
      clearInterval(clientRef.current.timerId);
      clientRef.current.timerId = null;
    }
    clientRef.current.config = null;
    setStatus({ state: '', text: 'Disconnected' });
  }, []);

  const fetchLatest = useCallback(async (config) => {
    const endpoint = `${config.url.replace(/\/$/, '')}/rest/v1/${encodeURIComponent(config.table)}?select=sensor_id,location,temperature,humidity,ldr_raw,daytime,created_at&order=created_at.desc&limit=50`;
    const requestId = ++clientRef.current.requestId;

    try {
      const response = await fetch(endpoint, {
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Supabase request failed (${response.status})`);
      }

      const rows = normalizeRows(await response.json());
      if (requestId !== clientRef.current.requestId) return;

      const latestByNode = new Map();
      rows.forEach(row => {
        const nodeId = matchNode(row);
        if (!nodeId || latestByNode.has(nodeId)) return;
        latestByNode.set(nodeId, row);
      });

      setNodeData(prev => {
        const next = { ...prev };

        NODES.forEach(node => {
          const row = latestByNode.get(node.id);
          if (!row) return;

          next[node.id] = {
            temp: row.temperature !== null && row.temperature !== undefined && row.temperature !== '' ? Number(row.temperature).toFixed(1) : null,
            humidity: row.humidity !== null && row.humidity !== undefined && row.humidity !== '' ? Number(row.humidity).toFixed(1) : null,
            light: row.ldr_raw !== null && row.ldr_raw !== undefined && row.ldr_raw !== '' ? Number(row.ldr_raw).toFixed(0) : null,
            ts: row.timestamp ? formatTime(row.timestamp) : now(),
            active: true,
          };
        });

        return next;
      });

      const recentLogs = rows.slice(0, 8).map(row => ({
        id: `${row.sensor_id}-${row.timestamp}`,
        ts: formatTime(row.timestamp),
        topic: row.sensor_id || 'sensor',
        val: `temp=${row.temperature ?? 'null'} hum=${row.humidity ?? 'null'} ldr=${row.ldr_raw ?? 'null'}`,
        isSys: false,
      }));

      if (recentLogs.length) {
        setLogs(prev => {
          const sys = prev.filter(entry => entry.isSys);
          const merged = [...sys, ...recentLogs];
          return merged.slice(0, 80);
        });
      }

      setStatus({ state: 'connected', text: 'Connected' });
      addLog(now(), 'System', `Loaded ${rows.length} row(s) from Supabase`, true);
    } catch (error) {
      if (requestId !== clientRef.current.requestId) return;
      setStatus({ state: 'error', text: 'Error' });
      addLog(now(), 'System', `Supabase error: ${error.message}`, true);
    }
  }, [addLog]);

  const connect = useCallback((supabaseUrl, anonKey, tableName = 'sensor_logs', pollIntervalMs = 5000) => {
    if (!supabaseUrl || !anonKey) {
      setStatus({ state: 'error', text: 'Missing Supabase config' });
      addLog(now(), 'System', 'Missing Supabase URL or anon key', true);
      return;
    }

    disconnect();
    const config = {
      url: supabaseUrl,
      anonKey,
      table: tableName || 'sensor_logs',
      pollIntervalMs: Number.isFinite(Number(pollIntervalMs)) ? Math.max(2000, Number(pollIntervalMs)) : 5000,
    };

    clientRef.current.config = config;
    setStatus({ state: '', text: 'Connecting…' });
    addLog(now(), 'System', `Connecting to Supabase table ${config.table}`, true);

    const run = () => fetchLatest(config);
    run();

    clientRef.current.timerId = setInterval(run, config.pollIntervalMs);
  }, [addLog, disconnect, fetchLatest]);

  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const tableName = import.meta.env.VITE_SUPABASE_TABLE || 'sensor_logs';
    const pollIntervalMs = import.meta.env.VITE_SUPABASE_POLL_MS || 5000;

    if (supabaseUrl && anonKey) {
      connect(supabaseUrl, anonKey, tableName, pollIntervalMs);
    } else {
      setStatus({ state: 'error', text: 'Missing config' });
      addLog(now(), 'System', 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY', true);
    }

    return () => disconnect();
  }, [addLog, connect, disconnect]);

  return { status, nodeData, logs, connect, clearLogs };
}