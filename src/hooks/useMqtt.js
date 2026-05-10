import { useState, useRef, useCallback } from 'react';
import mqtt from 'mqtt';
import { NODES, parseTopic } from '../data/nodes';

/* ── Helper ── */
function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/* ── Build initial state for all nodes ── */
function buildInitialNodeData() {
  const data = {};
  NODES.forEach(n => {
    data[n.id] = { temp: null, humidity: null, light: null, ts: null, active: false };
  });
  return data;
}

/**
 * Custom React hook encapsulating MQTT connection, message parsing,
 * node data state, log entries, and connection status.
 */
export function useMqtt() {
  const [status, setStatus] = useState({ state: '', text: 'Disconnected' });
  const [nodeData, setNodeData] = useState(buildInitialNodeData);
  const [logs, setLogs] = useState([
    { id: 0, ts: '', topic: '— Waiting for broker connection —', val: '', isSys: true },
  ]);
  const clientRef = useRef(null);
  const logIdRef = useRef(1);

  /* ── Add a log entry ── */
  const addLog = useCallback((ts, topic, val, isSys = false) => {
    setLogs(prev => {
      const next = [...prev, { id: logIdRef.current++, ts, topic, val, isSys }];
      return next.length > 80 ? next.slice(next.length - 80) : next;
    });
  }, []);

  /* ── Connect to broker ── */
  const connect = useCallback((username, aioKey, brokerUrl, topic) => {
    // Disconnect existing client
    if (clientRef.current) {
      try { clientRef.current.end(true); } catch (e) { /* ignore */ }
    }

    setStatus({ state: '', text: 'Connecting…' });
    addLog(now(), 'System', `Connecting to ${brokerUrl}`, true);

    const opts = {
      clientId: 'smartfarm_sub_' + Math.random().toString(16).substr(2, 6),
      username,
      password: aioKey,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
    };

    let client;
    try {
      client = mqtt.connect(brokerUrl, opts);
    } catch (e) {
      setStatus({ state: 'error', text: 'Error' });
      addLog(now(), 'System', 'Connection failed: ' + e.message, true);
      return;
    }

    clientRef.current = client;
    const subTopic = topic || (username + '/feeds/#');

    client.on('connect', () => {
      setStatus({ state: 'connected', text: 'Connected' });
      addLog(now(), 'System', 'Connected! Subscribing to ' + subTopic, true);
      client.subscribe(subTopic, err => {
        if (err) addLog(now(), 'System', 'Subscribe error: ' + err.message, true);
        else addLog(now(), 'System', 'Subscribed to ' + subTopic, true);
      });
    });

    client.on('message', (msgTopic, message) => {
      const val = message.toString();
      const ts = now();
      addLog(ts, msgTopic, val);

      const { nodeId, field } = parseTopic(msgTopic);
      if (nodeId && field) {
        if (field === 'status') {
          setNodeData(prev => ({
            ...prev,
            [nodeId]: {
              ...prev[nodeId],
              active: true,
              ts: new Date().toLocaleTimeString(),
            },
          }));
          return;
        }

        const numericValue = Number(val);
        if (!Number.isFinite(numericValue)) return;

        setNodeData(prev => ({
          ...prev,
          [nodeId]: {
            ...prev[nodeId],
            [field]: numericValue.toFixed(1),
            active: true,
            ts: new Date().toLocaleTimeString(),
          },
        }));
      }
    });

    client.on('error', err => {
      setStatus({ state: 'error', text: 'Error' });
      addLog(now(), 'System', 'Error: ' + err.message, true);
    });

    client.on('close', () => {
      setStatus({ state: '', text: 'Disconnected' });
      addLog(now(), 'System', 'Disconnected', true);
    });

    client.on('reconnect', () => {
      setStatus({ state: '', text: 'Reconnecting…' });
      addLog(now(), 'System', 'Reconnecting…', true);
    });
  }, [addLog]);

  /* ── Clear logs ── */
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return { status, nodeData, logs, connect, clearLogs };
}
