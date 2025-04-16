import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import HistoryPage from "@/pages/History";
import Analytics from "@/pages/Analytics";
import Translate from "@/pages/Translate";
import CitizenRequests from "@/pages/CitizenRequests";
import Meetings from "@/pages/Meetings";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";
import AboutSystem from "@/pages/AboutSystem";
import OrgStructurePage from "@/pages/OrgStructure";
import Documents from "@/pages/Documents";
import AIAgents from "@/pages/AIAgents";
import DAOVoting from "@/pages/DAOVoting";
import { useState } from "react";
import { User } from "./lib/types";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/translate" component={Translate} />
      <Route path="/citizen-requests" component={CitizenRequests} />
      <Route path="/meetings" component={Meetings} />
      <Route path="/documents" component={Documents} />
      <Route path="/org-structure" component={OrgStructurePage} />
      <Route path="/ai-agents/:id" component={AIAgents} />
      <Route path="/ai-agents" component={AIAgents} />
      <Route path="/settings" component={Settings} />
      <Route path="/dao-voting" component={DAOVoting} />
      <Route path="/about" component={AboutSystem} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // In a real app, we would get this from an auth system
  const [currentUser, setCurrentUser] = useState<User>({
    id: 1,
    username: "admin",
    fullName: "Айнур Бекова",
    department: "Департамент цифровизации",
    role: "admin",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&h=256&q=80"
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-white text-slate-800">
        <div className="flex flex-1">
          <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} currentUser={currentUser} />
          <main className={`flex-1 py-7 transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Router />
            </div>
          </main>
        </div>
        <Footer />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
