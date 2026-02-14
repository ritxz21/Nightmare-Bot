import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ThemeToggle from "@/components/ThemeToggle";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  const linkClass = (path: string) =>
    `text-xs font-mono transition-colors ${isActive(path) ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <header className="border-b border-border/50 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
          <span className="text-sm font-mono text-muted-foreground tracking-wider uppercase">
            Nightmare Bot
          </span>
        </button>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {/* Always visible */}
          <button onClick={() => navigate("/")} className={linkClass("/")}>
            Topics
          </button>
          <button onClick={() => navigate("/leaderboard")} className={linkClass("/leaderboard")}>
            Leaderboard
          </button>

          {/* Interviewee-specific */}
          {(!user || role === "interviewee") && (
            <>
              <button onClick={() => navigate("/resume")} className={`${linkClass("/resume")} leading-tight text-center w-14`}>
                Resume Review
              </button>
              {user && role === "interviewee" && (
                <>
                  <button onClick={() => navigate("/jd-prep")} className={linkClass("/jd-prep")}>
                    JD Prep
                  </button>
                  <button onClick={() => navigate("/invites")} className={linkClass("/invites")}>
                    Invites
                  </button>
                </>
              )}
            </>
          )}

          {/* Interviewer-specific */}
          {user && role === "interviewer" && (
            <button onClick={() => navigate("/company")} className={linkClass("/company")}>
              Company
            </button>
          )}

          {/* Authenticated common */}
          {user && (
            <>
              <button onClick={() => navigate("/dashboard")} className={linkClass("/dashboard")}>
                Dashboard
              </button>
              <button onClick={() => navigate("/history")} className={linkClass("/history")}>
                History
              </button>
            </>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                <span className="text-[10px] font-mono text-primary uppercase">
                  {user.email?.[0] || "U"}
                </span>
              </div>
              {role && (
                <span className="text-[9px] font-mono text-muted-foreground/60 uppercase px-1.5 py-0.5 rounded bg-secondary">
                  {role}
                </span>
              )}
              <button onClick={handleLogout} className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
                Logout
              </button>
            </div>
          ) : (
            <button onClick={() => navigate("/auth")} className="text-xs font-mono text-primary hover:text-primary/80 transition-colors">
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
