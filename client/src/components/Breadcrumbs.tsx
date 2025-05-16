import React from 'react';
import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  title: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

const Breadcrumbs = ({ items }: BreadcrumbsProps) => {
  return (
    <nav className="flex mb-4 text-sm">
      <ol className="flex items-center space-x-1">
        {items.map((item, index) => (
          <li key={item.href}>
            {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            {index === items.length - 1 ? (
              <span className="font-medium text-foreground">{item.title}</span>
            ) : (
              <Link href={item.href} className="text-muted-foreground hover:text-foreground transition-colors">
                {item.title}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;