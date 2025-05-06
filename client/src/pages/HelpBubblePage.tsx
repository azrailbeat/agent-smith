import React from 'react';
import HelpBubbleDemo from '@/components/HelpBubbleDemo';
import { HelpBubble } from '@/components/ui/help-bubble';
import { PageHeader } from '@/components/PageHeader';

/**
 * Страница демонстрации контекстных пузырьков с помощниками
 */
const HelpBubblePage = () => {
  return (
    <div className="container py-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <PageHeader 
          title="Контекстные помощники" 
          description="Демонстрация интерактивных помощников с контекстными подсказками"
        />
        <HelpBubble
          title="О помощниках"
          content={
            <div>
              <p>Контекстные помощники предоставляют интерактивные подсказки по всему интерфейсу.</p>
              <p className="mt-1">Каждый тип помощника имеет свой характер и специализацию.</p>
            </div>
          }
          character="default"
          position="bottom"
          size="lg"
        />
      </div>
      
      <HelpBubbleDemo />
    </div>
  );
};

export default HelpBubblePage;