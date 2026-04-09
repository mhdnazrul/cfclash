import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChangePasswordModal } from "@/components/settings/ChangePasswordModal";
import { fetchUserInfo } from "@/services/codeforces";
import { deleteMyAccount } from "@/lib/cfclash-service";
import { supabaseErrorMessage } from "@/lib/supabase-errors";
import { RefreshCw, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DELETE_CONFIRM = "DELETE";

const Settings = () => {
  const { user, loading, profile, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [displayEmail, setDisplayEmail] = useState("");
  const [cfHandle, setCfHandle] = useState("");
  const [pwdOpen, setPwdOpen] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [pageLoad, setPageLoad] = useState(true);
  const [newLoginEmail, setNewLoginEmail] = useState("");
  const [loginEmailBusy, setLoginEmailBusy] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select(
          "cf_handle, first_name, last_name, gender, age, phone, avatar_url, display_email",
        )
        .eq("id", user.id)
        .maybeSingle();
      const p = data as Record<string, unknown> | null;
      if (p) {
        setCfHandle((p.cf_handle as string) ?? "");
        setFirstName((p.first_name as string) ?? "");
        setLastName((p.last_name as string) ?? "");
        setGender((p.gender as string) ?? "");
        setAge(p.age != null ? String(p.age) : "");
        setPhone((p.phone as string) ?? "");
        setDisplayEmail((p.display_email as string) ?? user.email ?? "");
      }
      setPageLoad(false);
    })();
  }, [user?.id, user?.email]);

  if (loading || pageLoad) {
    return (
      <PageLayout>
        <div className="flex justify-center py-20 text-muted-foreground">Loading…</div>
      </PageLayout>
    );
  }
  if (!user) return <Navigate to="/auth/signin" replace />;

  const verifyAndSaveHandle = async () => {
    const h = cfHandle.trim();
    if (!h) {
      toast.error("Enter a Codeforces handle");
      return;
    }
    try {
      const users = await fetchUserInfo(h);
      if (!users.length) {
        toast.error("Codeforces does not recognize this handle");
        return;
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not verify handle");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        cf_handle: h,
        updated_at: new Date().toISOString(),
      } as never);
    if (error) toast.error(error.message);
    else {
      await refreshProfile();
      toast.success("Handle saved");
    }
  };

  const changeLoginEmail = async () => {
    const next = newLoginEmail.trim();
    if (!next) {
      toast.error("Enter a new sign-in email");
      return;
    }
    if (next.toLowerCase() === (user.email ?? "").toLowerCase()) {
      toast.error("That is already your sign-in email");
      return;
    }
    setLoginEmailBusy(true);
    const { error } = await supabase.auth.updateUser({ email: next });
    setLoginEmailBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Check your inbox to confirm the new address (Supabase may email your current address too).");
    setNewLoginEmail("");
  };

  const savePersonal = async () => {
    if (!firstName.trim()) {
      toast.error("First name is required");
      return;
    }
    if (!displayEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    const ageNum = age.trim() ? parseInt(age, 10) : null;
    if (age.trim() && (Number.isNaN(ageNum) || ageNum! < 1)) {
      toast.error("Invalid age");
      return;
    }
    if (!gender) {
      toast.error("Select gender");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        gender,
        age: ageNum,
        phone: phone.trim() || null,
        display_email: displayEmail.trim(),
        cf_handle: (cfHandle.trim() || profile?.cf_handle || null) as string | null,
        updated_at: new Date().toISOString(),
      } as never);
    if (error) toast.error(error.message);
    else {
      toast.success("Profile saved");
      await refreshProfile();
    }
  };

  const syncAvatar = async () => {
    const h = cfHandle.trim() || profile?.cf_handle;
    if (!h) {
      toast.error("Add a Codeforces handle first");
      return;
    }
    try {
      const users = await fetchUserInfo(h);
      const photo = users[0]?.titlePhoto;
      if (!photo) {
        toast.error("No avatar from Codeforces");
        return;
      }
      const { error } = await supabase.from("profiles").update({ avatar_url: photo } as never).eq("id", user.id);
      if (error) toast.error(error.message);
      else toast.success("Avatar synced");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    }
  };

  const removeHandle = async () => {
    const { error } = await supabase.from("profiles").update({ cf_handle: null } as never).eq("id", user.id);
    if (error) toast.error(error.message);
    else {
      setCfHandle("");
      await refreshProfile();
      toast.success("Handle removed");
    }
  };

  const deleteAccount = async () => {
    if (deletePhrase !== DELETE_CONFIRM) {
      toast.error(`Type ${DELETE_CONFIRM} to confirm`);
      return;
    }
    try {
      await deleteMyAccount();
      toast.success("Account deleted");
      window.location.href = "/";
      return;
    } catch (e: unknown) {
      toast.error(`${supabaseErrorMessage(e, "Delete failed")}. Falling back to profile cleanup…`);
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        deleted_at: new Date().toISOString(),
        cf_handle: null,
        first_name: null,
        last_name: null,
      } as never)
      .eq("id", user.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile cleaned up, signing out");
      await supabase.auth.signOut();
      window.location.href = "/";
    }
  };

  return (
    <PageLayout>
      <ChangePasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} email={user.email} />
      <section className="w-full px-4 sm:px-6 py-8 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-8">Settings</h1>
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <aside className="lg:w-64 shrink-0 space-y-6">
            <nav className="flex lg:flex-col gap-4 lg:gap-0 border-b lg:border-b-0 lg:border-r border-border pb-4 lg:pb-0 lg:pr-6">
              <span className="lg:pb-3 text-sm font-medium text-cyan-400 border-b-2 border-cyan-400 lg:border-b-0 lg:border-l-2 lg:border-l-cyan-400 lg:pl-3 -ml-px">
                Personal info
              </span>
              <button type="button" onClick={() => setPwdOpen(true)} className="lg:mt-4 text-sm text-muted-foreground hover:text-foreground text-left">
                Change password
              </button>
              <div className="lg:mt-6 pt-4 border-t border-border lg:border-t-0 lg:pt-0 lg:border-0 space-y-2">
                <h2 className="text-sm font-semibold">Sign-in email</h2>
                <p className="text-xs text-muted-foreground break-all">Current: {user.email ?? "—"}</p>
                <input
                  type="email"
                  value={newLoginEmail}
                  onChange={(e) => setNewLoginEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  placeholder="New email"
                  autoComplete="email"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="rounded-lg"
                  disabled={loginEmailBusy}
                  onClick={() => void changeLoginEmail()}
                >
                  {loginEmailBusy ? "Sending…" : "Request email change"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Uses Supabase Auth: you must confirm the new address before it replaces your login.
                </p>
              </div>
            </nav>
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Codeforces handle</h2>
              <p className="text-xs text-muted-foreground">Enter your correct handle — we verify it with the API.</p>
              <div className="flex items-center gap-2 rounded-full bg-muted/30 border border-border px-3 py-2">
                <input
                  value={cfHandle}
                  onChange={(e) => setCfHandle(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none min-w-0"
                  placeholder="handle"
                />
                {cfHandle && (
                  <button type="button" onClick={() => void removeHandle()} aria-label="Remove handle">
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </button>
                )}
              </div>
              <Button type="button" size="sm" variant="secondary" className="rounded-lg" onClick={() => void verifyAndSaveHandle()}>
                Save handle
              </Button>
            </div>
            <div className="pt-6 border-t border-border">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button type="button" className="text-sm text-destructive hover:underline">
                    Delete account
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This clears your profile data in cfclash. Type <strong>{DELETE_CONFIRM}</strong> to confirm. Full auth removal may
                      require your Supabase project admin.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <input
                    value={deletePhrase}
                    onChange={(e) => setDeletePhrase(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-background"
                    placeholder={DELETE_CONFIRM}
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void deleteAccount()}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </aside>

          <div className="flex-1 min-w-0 space-y-8">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-24 h-24 rounded-xl bg-muted border border-border shrink-0" />
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-2"
                  onClick={() => void syncAvatar()}
                >
                  <RefreshCw className="w-4 h-4" />
                  Sync image from Codeforces
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Uses your saved Codeforces handle</p>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Personal info</h2>
              <p className="text-sm text-muted-foreground mb-4">Provide your personal info</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">First name *</Label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl bg-background/80 border border-border"
                  />
                </div>
                <div>
                  <Label className="text-xs">Last name</Label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl bg-background/80 border border-border"
                  />
                </div>
                <div>
                  <Label className="text-xs">Gender *</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="mt-1 rounded-xl">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="na">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Age *</Label>
                  <input
                    type="number"
                    min={1}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl bg-background/80 border border-border"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Contact info</h2>
              <p className="text-sm text-muted-foreground mb-4">Provide your contact info</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Email *</Label>
                  <input
                    value={displayEmail}
                    onChange={(e) => setDisplayEmail(e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl bg-background/80 border border-border focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl bg-background/80 border border-border"
                  />
                </div>
              </div>
            </div>

            <Button type="button" className="rounded-xl btn-primary-gradient text-primary-foreground" onClick={() => void savePersonal()}>
              Save
            </Button>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Settings;
