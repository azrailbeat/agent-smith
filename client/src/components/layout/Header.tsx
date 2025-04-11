import { User } from "@/lib/types";
import { Settings, ChevronDown } from "lucide-react";
import { Link } from "wouter";

interface HeaderProps {
  currentUser: User;
}

const Header = ({ currentUser }: HeaderProps) => {
  return (
    <header className="bg-white text-slate-700 sticky top-0 z-50 shadow-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex-shrink-0 flex items-center">
            <svg className="h-8 w-8 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
            <span className="ml-3 text-xl font-medium text-slate-800">Agent Smith</span>
          </div>
          
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center space-x-1">
                <Link href="/settings">
                  <button className="ml-2 p-1 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-slate-100 transition-colors">
                    <Settings className="h-5 w-5" />
                  </button>
                </Link>
                
                <div className="relative pl-3">
                  <div className="flex items-center space-x-2 text-sm">
                    {currentUser.avatarUrl ? (
                      <img
                        className="h-8 w-8 rounded-full border border-slate-200"
                        src={currentUser.avatarUrl}
                        alt={`${currentUser.fullName} profile`}
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center border border-emerald-500/20">
                        <span className="text-sm font-medium text-white">
                          {currentUser.fullName.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
