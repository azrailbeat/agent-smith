import React from 'react';

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
    <div className={className}>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {description && (
        <p className="text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}