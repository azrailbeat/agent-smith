import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { User as UserType } from "@/lib/types";
import {
  Mic,
  BarChart2,
  FileText,
  LayoutDashboard,
  ListChecks,
  History,
  Calendar,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Users,
  FileCheck,
  Settings,
  Bot,
  Building2,
  Network,
  User,
  Shield,
  LogOut,
  Vote
} from "lucide-react";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  currentUser: UserType;
  isMobile?: boolean;
  visible?: boolean;
}

const Sidebar = ({ 
  collapsed, 
  onToggle, 
  isMobile = false,
  visible = true,
  currentUser = {
    id: 1,
    username: "admin",
    fullName: "Пользователь",
    department: "Не указан",
    role: "user",
  } 
}: SidebarProps) => {
  const [location] = useLocation();
  
  // Группы для навигации
  const navGroups = [
    {
      title: "Основное",
      items: [
        {
          name: "Дашборд",
          path: "/",
          icon: <LayoutDashboard size={20} />
        },
        {
          name: "Обращения граждан",
          path: "/citizen-requests",
          icon: <MessageSquare size={20} />
        },
        {
          name: "Переводчик",
          path: "/translate",
          icon: <Mic size={20} />
        },
        {
          name: "Протоколы собраний",
          path: "/meetings",
          icon: <Calendar size={20} />
        },
        {
          name: "Задачи",
          path: "/tasks",
          icon: <ListChecks size={20} />
        }
      ]
    },
    {
      title: "Управление",
      items: [
        {
          name: "Орг. структура",
          path: "/org-structure",
          icon: <Building2 size={20} />
        },
        {
          name: "ИИ агенты",
          path: "/ai-agents",
          icon: <Bot size={20} />
        },
        {
          name: "Документы",
          path: "/documents",
          icon: <FileCheck size={20} />
        },
        {
          name: "DAO Голосования",
          path: "/dao-voting",
          icon: <Vote size={20} />
        }
      ]
    },
    {
      title: "Информация",
      items: [
        {
          name: "История",
          path: "/history",
          icon: <History size={20} />
        },
        {
          name: "Аналитика",
          path: "/analytics",
          icon: <BarChart2 size={20} />
        },
        {
          name: "Настройки",
          path: "/settings",
          icon: <Settings size={20} />
        }
      ]
    }
  ];
  
  // Собираем все элементы навигации для удобной итерации
  const navItems = navGroups.flatMap(group => group.items);

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-screen bg-slate-50 border-r border-slate-200 transition-all duration-300 ease-in-out z-20 shadow-sm",
        collapsed ? "w-14 sm:w-16" : "w-56 sm:w-64",
        isMobile && !visible ? "-translate-x-full" : "translate-x-0",
        isMobile ? "md:hidden" : ""
      )}
    >
      <div className="flex flex-col h-full pb-4">
        {/* Логотип */}
        <div className={cn("p-3 border-b border-slate-200", 
          collapsed ? "flex justify-center" : "px-4"
        )}>
          <div className="flex items-center">
            <div className="text-emerald-600">
              {collapsed ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <div className="flex items-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="ml-2 text-lg font-medium text-emerald-700">Agent Smith</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-1 py-5">
          {collapsed ? (
            <ul className="space-y-2 px-3">
              {navItems.map((item) => (
                <li key={item.path}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={item.path}>
                          <Button
                            variant={location === item.path || (item.path === "/" && location === "") ? "default" : "ghost"}
                            size="icon"
                            className={cn(
                              "w-full justify-center",
                              location === item.path || (item.path === "/" && location === "")
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-800"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            )}
                          >
                            {item.icon}
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.name}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-6">
              {navGroups.map((group, index) => (
                <div key={index}>
                  <h3 className="mb-2 px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    {group.title}
                  </h3>
                  <ul className="space-y-1 px-3">
                    {group.items.map((item) => (
                      <li key={item.path}>
                        <Link href={item.path}>
                          <Button
                            variant={location === item.path || (item.path === "/" && location === "") ? "default" : "ghost"}
                            className={cn(
                              "w-full justify-start rounded-lg",
                              location === item.path || (item.path === "/" && location === "")
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-800"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            )}
                          >
                            <span className="flex-shrink-0 mr-3">{item.icon}</span>
                            <span className="truncate">{item.name}</span>
                          </Button>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="px-3 mt-auto space-y-3">
          {/* Профиль пользователя */}
          <div className={cn(
            "border rounded-lg overflow-hidden",
            collapsed ? "p-2" : "p-3"
          )}>
            {collapsed ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex justify-center">
                      {currentUser.avatarUrl ? (
                        <img
                          className="h-8 w-8 rounded-full border border-slate-200"
                          src={currentUser.avatarUrl}
                          alt={`${currentUser.fullName} profile`}
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center">
                          <span className="text-sm font-medium text-white">{currentUser.fullName.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">{currentUser.fullName}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center cursor-pointer">
                    {currentUser.avatarUrl ? (
                      <img
                        className="h-8 w-8 rounded-full border border-slate-200 flex-shrink-0"
                        src={currentUser.avatarUrl}
                        alt={`${currentUser.fullName} profile`}
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-white">{currentUser.fullName.charAt(0)}</span>
                      </div>
                    )}
                    <div className="ml-3 overflow-hidden">
                      <p className="text-sm font-medium text-slate-800 truncate">{currentUser.fullName}</p>
                      <p className="text-xs text-slate-500 truncate">{currentUser.department}</p>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/profile">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Профиль</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/settings">
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Настройки</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/security">
                    <DropdownMenuItem>
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Безопасность</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Выйти</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {/* Кнопка сворачивания */}
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            onClick={onToggle}
            className="w-full justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            {collapsed ? <ChevronRight size={20} /> : <><ChevronLeft size={20} className="mr-2" /> Свернуть</>}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;