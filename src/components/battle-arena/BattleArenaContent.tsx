import { useState } from "react";
import { Swords, Plus, LogIn } from "lucide-react";
import { ActiveRooms } from "./ActiveRooms";
import { CreateRoomModal } from "./CreateRoomModal";
import { JoinRoomModal } from "./JoinRoomModal";
import { BattleRoom } from "./BattleRoom";

export function BattleArenaContent() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  if (activeRoomId) return <BattleRoom roomId={activeRoomId} onLeave={() => setActiveRoomId(null)} />;

  return (
    <section className="w-full px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3"><Swords className="w-5 h-5 text-primary" /><h1 className="text-3xl font-bold text-foreground">Battle Arena</h1></div>
          <div className="flex gap-3">
            <button onClick={() => setShowJoinModal(true)} className="flex items-center gap-2 px-6 py-3 rounded-lg border border-border"><LogIn className="w-5 h-5" /> Request Join</button>
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-6 py-3 rounded-lg btn-primary-gradient text-primary-foreground"><Plus className="w-5 h-5" /> Create Room</button>
          </div>
        </div>
        <ActiveRooms onJoinRoom={setActiveRoomId} />
        {showCreateModal && <CreateRoomModal onClose={() => setShowCreateModal(false)} onCreated={(id) => { setShowCreateModal(false); setActiveRoomId(id); }} />}
        {showJoinModal && <JoinRoomModal onClose={() => setShowJoinModal(false)} onJoined={() => {}} />}
      </div>
    </section>
  );
}
