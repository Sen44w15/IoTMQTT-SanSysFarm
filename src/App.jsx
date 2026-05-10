import { useState } from 'react';
import Header from './components/Header';
import NodeGrid from './components/NodeGrid';
import LogPanel from './components/LogPanel';
import SettingsModal from './components/SettingsModal';
import { useSupabase } from './hooks/useSupabase';

export default function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const { status, nodeData, logs, connect, clearLogs } = useSupabase();

  return (
    <>
      <Header status={status} onOpenSettings={() => setModalOpen(true)} />

      <main>
        <div className="section-label"><span>Node Overview</span></div>
        <NodeGrid nodeData={nodeData} />

        <div className="section-label"><span>Live Log</span></div>
        <LogPanel logs={logs} onClear={clearLogs} />
      </main>

      <SettingsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnect={connect}
      />
    </>
  );
}
