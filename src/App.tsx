import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Interview from "./pages/Interview";
import Auth from "./pages/Auth";
import History from "./pages/History";
import Results from "./pages/Results";
import InterviewerDashboard from "./pages/InterviewerDashboard";
import ResumeInterview from "./pages/ResumeInterview";
import JdPrep from "./pages/JdPrep";
import Invites from "./pages/Invites";
import CompanyDashboard from "./pages/CompanyDashboard";
import JobRoleDetail from "./pages/JobRoleDetail";
import Leaderboard from "./pages/Leaderboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/interview/:topicId" element={<Interview />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/history" element={<History />} />
          <Route path="/results/:sessionId" element={<Results />} />
          <Route path="/dashboard" element={<InterviewerDashboard />} />
          <Route path="/resume" element={<ResumeInterview />} />
          <Route path="/jd-prep" element={<JdPrep />} />
          <Route path="/invites" element={<Invites />} />
          <Route path="/company" element={<CompanyDashboard />} />
          <Route path="/company/:jobRoleId" element={<JobRoleDetail />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
