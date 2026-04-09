import { PageLayout } from "@/components/PageLayout";
import { BattleArenaContent } from "@/components/battle-arena/BattleArenaContent";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { LoadingFallback } from "@/components/common/LoadingFallback";

const BattleArena = () => {
  const { user, loading, isProfileComplete } = useAuth();
  
  if (loading) {
    return (
      <PageLayout>
        <LoadingFallback message="Loading battle arena..." />
      </PageLayout>
    );
  }
  
  if (!user) return <Navigate to="/auth/signin" replace />;
  if (!isProfileComplete) return <Navigate to="/auth/complete-profile" replace />;
  return <PageLayout><BattleArenaContent /></PageLayout>;
};

export default BattleArena;
