import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  Network
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
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
          name: "Задачи",
          path: "/tasks",
          icon: <ListChecks size={20} />
        },
        {
          name: "Обращения граждан",
          path: "/citizen-requests",
          icon: <MessageSquare size={20} />
        },
        {
          name: "Протоколы встреч",
          path: "/meetings",
          icon: <Calendar size={20} />
        }
      ]
    },
    {
      title: "Управление",
      items: [
        {
          name: "ИИ агенты",
          path: "/ai-agents",
          icon: <Bot size={20} />
        },
        {
          name: "Орг. структура",
          path: "/org-structure",
          icon: <Building2 size={20} />
        },
        {
          name: "Документы",
          path: "/documents",
          icon: <FileCheck size={20} />
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
          name: "Перевод",
          path: "/translate",
          icon: <Mic size={20} />
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
        "fixed left-0 top-14 h-screen bg-slate-50 border-r border-slate-200 transition-all duration-300 ease-in-out z-20 shadow-sm",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex flex-col h-[calc(100vh-3.5rem)] pb-4">
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
                            <span className="mr-3">{item.icon}</span>
                            {item.name}
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
        
        <div className="px-3 mt-auto">
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