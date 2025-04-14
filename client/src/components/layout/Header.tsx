import { User } from "@/lib/types";

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
        </div>
      </div>
    </header>
  );
};

export default Header;
