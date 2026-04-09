import { PageLayout } from "@/components/PageLayout";
import { BattleRoom } from "@/components/battle-arena/BattleRoom";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useParams } from "react-router-dom";

const RoomPage = () => {
  const { roomId } = useParams();
  const { user, loading, isProfileComplete } = useAuth();

  if (loading) {
    return (
      <PageLayout>
        <div className="flex justify-center py-20 text-muted-foreground">Loading…</div>
      </PageLayout>
    );
  }
  if (!user) return <Navigate to="/auth/signin" replace state={{ from: `/battle-arena/room/${roomId}` }} />;
  if (!isProfileComplete) return <Navigate to="/auth/complete-profile" replace />;
  if (!roomId) return <Navigate to="/battle-arena" replace />;

  return (
    <PageLayout>
      <BattleRoom roomId={roomId} />
    </PageLayout>
  );
};

export default RoomPage;
