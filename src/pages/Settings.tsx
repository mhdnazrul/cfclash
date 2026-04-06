import { useState } from "react";
import { Navigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const Settings = () => {
  const { user, loading, profile, refreshProfile } = useAuth();
  const [cfHandle, setCfHandle] = useState(profile?.cf_handle ?? "");

  if (loading) return <PageLayout><div className="flex justify-center py-20 text-muted-foreground">Loading...</div></PageLayout>;
  if (!user) return <Navigate to="/auth/signin" replace />;

  const save = async () => {
    const { error } = await (supabase as any).from("profiles").upsert({ id: user.id, cf_handle: cfHandle?.trim() || null });
    if (error) toast.error(error.message);
    else {
      await refreshProfile();
      toast.success("Profile updated");
    }
  };

  const removeHandle = async () => {
    const { error } = await (supabase as any).from("profiles").update({ cf_handle: null }).eq("id", user.id);
    if (error) toast.error(error.message);
    else {
      setCfHandle("");
      await refreshProfile();
      toast.success("Handle removed");
    }
  };

  return (
    <PageLayout>
      <section className="w-full px-6 py-8">
        <div className="max-w-3xl mx-auto glass-card p-6">
          <h1 className="text-2xl font-bold mb-2">Settings</h1>
          <input value={cfHandle ?? ""} onChange={(e) => setCfHandle(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-card/50 border border-border mt-4" />
          <div className="flex gap-3 mt-6">
            <button onClick={save} className="px-5 py-2 rounded-lg btn-primary-gradient text-primary-foreground">Save Profile</button>
            <AlertDialog>
              <AlertDialogTrigger asChild><button className="px-5 py-2 rounded-lg border border-destructive/40 text-destructive">Remove Handle</button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Codeforces handle?</AlertDialogTitle>
                  <AlertDialogDescription>This will block battle participation until you add a valid handle again.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={removeHandle}>Confirm Remove</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Settings;
