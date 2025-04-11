import { User } from "@/lib/types";
import { BellIcon, Menu } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  currentUser: User;
}

const Header = ({ currentUser }: HeaderProps) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className="bg-neutral-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <svg className="h-8 w-8 text-primary-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
            <span className="ml-2 text-xl font-medium gradient-text">Agent Smith</span>
          </div>
          
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center space-x-3">
                <button 
                  className="flex items-center justify-center p-2 rounded-full bg-neutral-700 text-white hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                >
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
      
      {/* Выпадающие уведомления */}
      {notificationsOpen && (
        <div className="absolute right-4 top-16 mt-2 w-80 rounded-md shadow-lg bg-neutral-800 border border-neutral-700 z-50">
          <div className="p-3 border-b border-neutral-700">
            <h3 className="text-lg font-medium text-white">Уведомления</h3>
          </div>
          <div className="max-h-72 overflow-y-auto">
            <div className="p-4 border-b border-neutral-700">
              <p className="text-sm text-neutral-300">Совещание "Внедрение AI в госсектор" начнется через 30 минут</p>
              <p className="text-xs text-neutral-500 mt-1">10 минут назад</p>
            </div>
            <div className="p-4 border-b border-neutral-700">
              <p className="text-sm text-neutral-300">Новое обращение гражданина требует вашего внимания</p>
              <p className="text-xs text-neutral-500 mt-1">1 час назад</p>
            </div>
            <div className="p-4">
              <p className="text-sm text-neutral-300">Задача "Подготовить отчет" выполнена</p>
              <p className="text-xs text-neutral-500 mt-1">вчера</p>
            </div>
          </div>
          <div className="p-2 border-t border-neutral-700 text-center">
            <button className="text-sm text-blue-400 hover:text-blue-300">
              Все уведомления
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
