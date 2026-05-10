import { NODES } from '../data/nodes';
import NodeCard from './NodeCard';

/**
 * NodeGrid — Renders the grid of all farm node cards.
 */
export default function NodeGrid({ nodeData }) {
  return (
    <div className="node-grid" id="nodeGrid">
      {NODES.map(node => (
        <NodeCard key={node.id} node={node} data={nodeData[node.id]} />
      ))}
    </div>
  );
}
