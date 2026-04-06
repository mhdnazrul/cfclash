import { PageLayout } from "@/components/PageLayout";
import { BattleArenaContent } from "@/components/battle-arena/BattleArenaContent";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

const BattleArena = () => {
  const { user, loading, isProfileComplete } = useAuth();
  if (loading) return <PageLayout><div className="flex justify-center py-20 text-muted-foreground">Loading...</div></PageLayout>;
  if (!user) return <Navigate to="/auth/signin" replace />;
  if (!isProfileComplete) return <Navigate to="/auth/complete-profile" replace />;
  return <PageLayout><BattleArenaContent /></PageLayout>;
};

export default BattleArena;
