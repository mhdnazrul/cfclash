import { PageLayout } from "@/components/PageLayout";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

const SignUp = () => {
  const { user, loading, isProfileComplete } = useAuth();
  if (loading) return <PageLayout><div className="flex justify-center py-20 text-muted-foreground">Loading...</div></PageLayout>;
  if (user && isProfileComplete) return <Navigate to="/dashboard" replace />;
  if (user && !isProfileComplete) return <Navigate to="/auth/complete-profile" replace />;
  return (
    <PageLayout>
      <SignUpForm />
    </PageLayout>
  );
};

export default SignUp;
