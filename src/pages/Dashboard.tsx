import { PageLayout } from "@/components/PageLayout";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { LoadingFallback } from "@/components/common/LoadingFallback";

const Dashboard = () => {
  const { user, loading, isProfileComplete } = useAuth();
  
  if (loading) {
    return (
      <PageLayout>
        <LoadingFallback message="Loading dashboard..." />
      </PageLayout>
    );
  }
  
  if (!user) return <Navigate to="/auth/signin" replace />;
  if (!isProfileComplete) return <Navigate to="/auth/complete-profile" replace />;
  return <PageLayout><DashboardContent /></PageLayout>;
};

export default Dashboard;
