import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill in all fields"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    navigate("/dashboard");
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) toast.error(error.message);
  };

  return (
    <section className="w-full px-6 py-16">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(187_92%_69%/0.1)] border border-[hsl(187_92%_69%/0.2)] mb-6">
            <Zap className="w-4 h-4 text-[hsl(187,92%,69%)]" />
            <span className="text-sm text-[hsl(187,92%,69%)] font-medium">Welcome Back</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Sign in to Battle</h1>
          <p className="text-muted-foreground">Enter your credentials to continue</p>
        </div>

        <div className="glass-card p-8">
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-lg border border-border bg-background/50 text-foreground font-medium hover:bg-card/50 transition-colors mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background text-muted-foreground">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                  className="w-full pl-12 pr-4 py-3 rounded-lg bg-background/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password"
                  className="w-full pl-12 pr-12 py-3 rounded-lg bg-background/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg btn-primary-gradient text-primary-foreground font-medium hover:glow-blue transition-all duration-300 disabled:opacity-50">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            You'll need to link your Codeforces handle after signing in
          </p>
        </div>

        <p className="mt-6 text-center text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/auth/signup" className="text-primary hover:text-primary/80 transition-colors">Sign up</Link>
        </p>
      </div>
    </section>
  );
}
