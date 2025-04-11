import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  CheckSquare, 
  History, 
  BarChart2, 
  Settings, 
  HelpCircle,
  FileText,
  Languages
} from "lucide-react";

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar = ({ collapsed = false, onToggle }: SidebarProps) => {
  const [location] = useLocation();

  const navigation = [
    { name: "Панель управления", href: "/", icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: "Мои задачи", href: "/tasks", icon: <CheckSquare className="h-5 w-5" /> },
    { name: "История решений", href: "/history", icon: <History className="h-5 w-5" /> },
    { name: "Аналитика", href: "/analytics", icon: <BarChart2 className="h-5 w-5" /> },
    { name: "Документы", href: "/documents", icon: <FileText className="h-5 w-5" /> },
    { name: "Переводчик", href: "/translate", icon: <Languages className="h-5 w-5" /> },
  ];

  const secondaryNavigation = [
    { name: "Настройки", href: "/settings", icon: <Settings className="h-5 w-5" /> },
    { name: "Справка", href: "/help", icon: <HelpCircle className="h-5 w-5" /> },
  ];

  return (
    <div className={`hidden lg:flex flex-col bg-sidebar fixed inset-y-0 left-0 border-r border-sidebar-border 
      transition-all duration-300 ease-in-out z-10 
      ${collapsed ? 'w-16' : 'w-64'}`}
    >
      <div className="flex h-16 items-center justify-between px-4 py-5">
        {!collapsed && (
          <div className="flex items-center">
            <svg className="h-8 w-8 text-sidebar-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
            <span className="ml-2 text-xl font-medium text-sidebar-foreground">Agent Smith</span>
          </div>
        )}
        {collapsed && (
          <svg className="h-8 w-8 text-sidebar-primary mx-auto" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
        )}
        {onToggle && (
          <button 
            onClick={onToggle}
            className="rounded-md p-1 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {collapsed ? (
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        )}
      </div>
      
      <div className="flex flex-col flex-grow overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href}>
              <a 
                className={`
                  ${location === item.href
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  } 
                  group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                `}
              >
                <div className={`mr-3 flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`}>
                  {item.icon}
                </div>
                {!collapsed && <span>{item.name}</span>}
              </a>
            </Link>
          ))}
        </nav>
        
        <div className="px-2 py-4 space-y-1 border-t border-sidebar-border">
          {secondaryNavigation.map((item) => (
            <Link key={item.href} href={item.href}>
              <a 
                className={`
                  ${location === item.href
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  } 
                  group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                `}
              >
                <div className={`mr-3 flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`}>
                  {item.icon}
                </div>
                {!collapsed && <span>{item.name}</span>}
              </a>
            </Link>
          ))}
        </div>
      </div>
      
      <div className="p-4 border-t border-sidebar-border">
        {!collapsed && (
          <div className="text-xs text-sidebar-foreground/70">
            <p>Agent Smith v1.2.5</p>
            <p className="mt-1">GovChain + RoAI</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
