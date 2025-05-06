import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

/**
 * Компонент заголовка страницы
 */
export function PageHeader({ title, description, className }: PageHeaderProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}