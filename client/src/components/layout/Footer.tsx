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
                <a className="text-neutral-500 hover:text-neutral-700">
                  <span className="text-sm">Помощь</span>
                </a>
              </Link>
              <Link href="/legal">
                <a className="text-neutral-500 hover:text-neutral-700">
                  <span className="text-sm">Правовая информация</span>
                </a>
              </Link>
              <Link href="/privacy">
                <a className="text-neutral-500 hover:text-neutral-700">
                  <span className="text-sm">Политика конфиденциальности</span>
                </a>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
