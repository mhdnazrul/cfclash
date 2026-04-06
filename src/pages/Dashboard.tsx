import { PageLayout } from "@/components/PageLayout";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

const Dashboard = () => {
  const { user, loading, isProfileComplete } = useAuth();
  if (loading) return <PageLayout><div className="flex justify-center py-20 text-muted-foreground">Loading...</div></PageLayout>;
  if (!user) return <Navigate to="/auth/signin" replace />;
  if (!isProfileComplete) return <Navigate to="/auth/complete-profile" replace />;
  return <PageLayout><DashboardContent /></PageLayout>;
};

export default Dashboard;
