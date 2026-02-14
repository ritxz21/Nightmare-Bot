import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b border-border/50 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
          <span className="text-sm font-mono text-muted-foreground tracking-wider uppercase">
            DeepFake Interviewer
          </span>
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className={`text-xs font-mono transition-colors ${isActive("/dashboard") ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate("/resume")}
            className={`text-xs font-mono transition-colors ${isActive("/resume") ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Resume
          </button>
          <button
            onClick={() => navigate("/history")}
            className={`text-xs font-mono transition-colors ${isActive("/history") ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            History
          </button>
          {user ? (
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                <span className="text-[10px] font-mono text-primary uppercase">
                  {user.email?.[0] || "U"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate("/auth")}
              className="text-xs font-mono text-primary hover:text-primary/80 transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
