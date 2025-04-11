import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import DecisionHistory from "@/pages/DecisionHistory";
import Analytics from "@/pages/Analytics";
import Translate from "@/pages/Translate";
import NotFound from "@/pages/not-found";
import { useState } from "react";
import { User } from "./lib/types";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/history" component={DecisionHistory} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/translate" component={Translate} />
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

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900">
        <Header currentUser={currentUser} />
        <main className="flex-1 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Router />
          </div>
        </main>
        <Footer />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
