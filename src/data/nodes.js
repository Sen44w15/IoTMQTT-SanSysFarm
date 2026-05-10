/* ════════════════════════════════════
   SmartFarm — Node Definitions
════════════════════════════════════ */

export const NODES = [
  { id: 'NODE_01', name: 'Paranaque Field', emoji: '🏞️', keywords: ['node01', 'node_01', 'paranaque'] },
  { id: 'NODE_02', name: 'Makati Greenhouse', emoji: '🏙️', keywords: ['node02', 'node_02', 'makati'] },
  { id: 'NODE_03', name: 'Pasay Station', emoji: '🌊', keywords: ['node03', 'node_03', 'pasay'] },
  { id: 'NODE_04', name: 'Taguig BGC Farm', emoji: '🏢', keywords: ['node04', 'node_04', 'taguig', 'bgc'] },
];

export const DEFAULT_NODE_ID = 'NODE_03';

/**
 * Parse an MQTT topic string to extract the node ID and metric field.
 */
export function parseTopic(topic) {
  const lower = topic.toLowerCase();
  let matchedNode = null;

  for (const node of NODES) {
    if (node.keywords.some(k => lower.includes(k))) {
      matchedNode = node.id;
      break;
    }
  }

  if (!matchedNode && (lower.includes('smartfarm') || lower.includes('/feeds/'))) {
    matchedNode = DEFAULT_NODE_ID;
  }

  let field = null;
  if (lower.includes('temp')) field = 'temp';
  else if (lower.includes('hum')) field = 'humidity';
  else if (lower.includes('ldr') || lower.includes('light') || lower.includes('lux')) field = 'light';
  else if (lower.includes('status')) field = 'status';

  return { nodeId: matchedNode, field };
}
