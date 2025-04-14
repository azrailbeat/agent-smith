import { User } from "@/lib/types";

interface HeaderProps {
  currentUser: User;
}

// Пустой компонент Header, так как логотип переместился в боковую панель
const Header = ({ currentUser }: HeaderProps) => {
  return null;
};

export default Header;
