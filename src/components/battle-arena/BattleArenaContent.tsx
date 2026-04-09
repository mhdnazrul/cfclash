import { useState } from "react";
import { Swords, Plus, LogIn } from "lucide-react";
import { ActiveRooms } from "./ActiveRooms";
import { CreateRoomModal } from "./CreateRoomModal";
import { JoinRoomModal } from "./JoinRoomModal";

export function BattleArenaContent() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  return (
    <section className="w-full px-4 sm:px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Swords className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Battle Arena</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Create or join real-time competitive battles</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowJoinModal(true)}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border text-foreground hover:bg-muted/30 transition-colors"
            >
              <LogIn className="w-5 h-5" /> Join room
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl btn-primary-gradient text-primary-foreground font-medium"
            >
              <Plus className="w-5 h-5" /> Create room
            </button>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-foreground mt-10 mb-4">Active rooms</h2>
        <ActiveRooms />

        {showCreateModal && (
          <CreateRoomModal
            onClose={() => setShowCreateModal(false)}
          />
        )}
        {showJoinModal && <JoinRoomModal onClose={() => setShowJoinModal(false)} />}
      </div>
    </section>
  );
}
