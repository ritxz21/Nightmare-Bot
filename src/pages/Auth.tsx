import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Role = "interviewer" | "interviewee";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("interviewee");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isLogin) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
      } else {
        // Check user role and navigate accordingly
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roles } = await supabase
            .from("user_roles" as any)
            .select("role")
            .eq("user_id", user.id);
          const userRole = (roles as any)?.[0]?.role;
          navigate(userRole === "interviewer" ? "/dashboard" : "/");
        }
      }
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (signUpError) {
        setError(signUpError.message);
      } else if (data.user) {
        // Insert role
        const { error: roleError } = await supabase
          .from("user_roles" as any)
          .insert({ user_id: data.user.id, role });
        if (roleError) console.error("Role insert error:", roleError);
        navigate(role === "interviewer" ? "/dashboard" : "/");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
            <span className="text-sm font-mono text-muted-foreground tracking-wider uppercase">
              DeepFake Interviewer
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {isLogin ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Sign in to continue" : "Sign up to get started"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role picker — signup only */}
          {!isLogin && (
            <div>
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-2">
                I am an
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("interviewee")}
                  className={`p-3 rounded-lg border text-left transition-all duration-300 ${
                    role === "interviewee"
                      ? "border-primary bg-primary/10 card-glow-hover"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="text-xl mb-1">🎯</div>
                  <div className="text-sm font-semibold text-foreground">Interviewee</div>
                  <div className="text-[10px] text-muted-foreground">Practice & get grilled</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("interviewer")}
                  className={`p-3 rounded-lg border text-left transition-all duration-300 ${
                    role === "interviewer"
                      ? "border-primary bg-primary/10 card-glow-hover"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="text-xl mb-1">🔍</div>
                  <div className="text-sm font-semibold text-foreground">Interviewer</div>
                  <div className="text-[10px] text-muted-foreground">Review candidates</div>
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-md bg-secondary border border-border text-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2.5 rounded-md bg-secondary border border-border text-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-xs text-destructive font-mono">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "..." : isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground font-mono">
          {isLogin ? "No account? " : "Already have an account? "}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-primary hover:underline underline-offset-4"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>

        <button
          onClick={() => navigate("/")}
          className="block mx-auto text-xs text-muted-foreground/50 font-mono hover:text-muted-foreground transition-colors"
        >
          ← Continue without account
        </button>
      </div>
    </div>
  );
};

export default Auth;
