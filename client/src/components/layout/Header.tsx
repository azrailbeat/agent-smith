import { Link, useLocation } from "wouter";
import { User } from "@/lib/types";
import { BellIcon } from "lucide-react";

interface HeaderProps {
  currentUser: User;
}

const Header = ({ currentUser }: HeaderProps) => {
  const [location] = useLocation();

  const navigation = [
    { name: "Панель управления", href: "/" },
    { name: "Мои задачи", href: "/tasks" },
    { name: "История решений", href: "/history" },
    { name: "Аналитика", href: "/analytics" },
    { name: "Переводчик", href: "/translate" },
  ];

  return (
    <header className="bg-primary-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
              <span className="ml-2 text-xl font-medium">Agent Smith</span>
            </div>
            <nav className="ml-6 flex space-x-8">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href}>
                  <span 
                    className={`
                      ${location === item.href
                        ? "border-b-2 border-white"
                        : "border-transparent border-b-2 hover:border-neutral-300"
                      } 
                      px-1 pt-1 inline-flex items-center text-sm font-medium cursor-pointer
                    `}
                  >
                    {item.name}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center space-x-3">
                <button className="flex items-center justify-center p-2 rounded-full bg-primary-700 text-white focus:outline-none focus:ring-2 focus:ring-white">
                  <BellIcon className="h-6 w-6" />
                </button>
                <div className="relative">
                  <button className="flex items-center space-x-2 text-sm focus:outline-none">
                    {currentUser.avatarUrl ? (
                      <img
                        className="h-8 w-8 rounded-full"
                        src={currentUser.avatarUrl}
                        alt={`${currentUser.fullName} profile`}
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary-700 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {currentUser.fullName.charAt(0)}
                        </span>
                      </div>
                    )}
                    <span>{currentUser.fullName}</span>
                  </button>
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
