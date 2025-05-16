import { UserMenu } from "./UserMenu";

interface HeaderProps {
  // Сохраняем интерфейс для обратной совместимости
  currentUser?: any;
}

const Header = ({ currentUser }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Место для дополнительных элементов слева */}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Компонент пользовательского меню с аутентификацией */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
};

export default Header;
