import { PageLayout } from "@/components/PageLayout";
import { CompleteProfileForm } from "@/components/auth/CompleteProfileForm";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { LoadingFallback } from "@/components/common/LoadingFallback";

const CompleteProfile = () => {
  const { user, loading, isProfileComplete } = useAuth();

  if (loading) {
    return (
      <PageLayout>
        <LoadingFallback message="Loading profile..." />
      </PageLayout>
    );
  }
  
  if (!user) return <Navigate to="/auth/signin" replace />;
  if (isProfileComplete) return <Navigate to="/dashboard" replace />;

  return (
    <PageLayout>
      <CompleteProfileForm />
    </PageLayout>
  );
};

export default CompleteProfile;
