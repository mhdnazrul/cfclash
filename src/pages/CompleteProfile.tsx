import { PageLayout } from "@/components/PageLayout";
import { CompleteProfileForm } from "@/components/auth/CompleteProfileForm";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

const CompleteProfile = () => {
  const { user, loading, isProfileComplete } = useAuth();

  if (loading) return <PageLayout><div className="flex justify-center py-20 text-muted-foreground">Loading...</div></PageLayout>;
  if (!user) return <Navigate to="/auth/signin" replace />;
  if (isProfileComplete) return <Navigate to="/dashboard" replace />;

  return (
    <PageLayout>
      <CompleteProfileForm />
    </PageLayout>
  );
};

export default CompleteProfile;
