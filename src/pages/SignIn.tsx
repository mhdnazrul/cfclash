import { PageLayout } from "@/components/PageLayout";
import { SignInForm } from "@/components/auth/SignInForm";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

const SignIn = () => {
  const { user, loading, isProfileComplete } = useAuth();
  if (loading) return <PageLayout><div className="flex justify-center py-20 text-muted-foreground">Loading...</div></PageLayout>;
  if (user && isProfileComplete) return <Navigate to="/dashboard" replace />;
  if (user && !isProfileComplete) return <Navigate to="/auth/complete-profile" replace />;
  return (
    <PageLayout>
      <SignInForm />
    </PageLayout>
  );
};

export default SignIn;
