import { Link } from "wouter";

const Footer = () => {
  return (
    <footer className="bg-white">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 border-t border-neutral-200">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex items-center">
            <span className="text-neutral-500 text-sm">
              © 2025 Agent Smith RoAI + GovChain | Версия 1.2.5
            </span>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="flex space-x-6">
              <Link href="/help">
                <span className="text-neutral-500 hover:text-neutral-700 cursor-pointer">
                  <span className="text-sm">Помощь</span>
                </span>
              </Link>
              <Link href="/legal">
                <span className="text-neutral-500 hover:text-neutral-700 cursor-pointer">
                  <span className="text-sm">Правовая информация</span>
                </span>
              </Link>
              <Link href="/privacy">
                <span className="text-neutral-500 hover:text-neutral-700 cursor-pointer">
                  <span className="text-sm">Политика конфиденциальности</span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
