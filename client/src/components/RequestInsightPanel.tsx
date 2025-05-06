import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, FileText, Tag, Lightbulb, MessageSquare } from 'lucide-react';

interface CitizenRequest {
  id: number;
  fullName: string;
  contactInfo: string;
  requestType: string;
  subject: string;
  description: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  aiProcessed?: boolean;
  aiClassification?: string;
  aiSuggestion?: string;
  summary?: string;
}

interface RequestInsightPanelProps {
  request: CitizenRequest;
}

const RequestInsightPanel: React.FC<RequestInsightPanelProps> = ({ request }) => {
  if (!request.aiProcessed) {
    return (
      <Card className="bg-gray-50 border border-dashed">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <Bot className="h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-500">
              Это обращение еще не обработано с помощью ИИ.
              Используйте панель ИИ-обработки для анализа этого обращения.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-4 w-4" />
          Результаты ИИ-анализа
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Классификация */}
        {request.aiClassification && (
          <div className="flex items-start gap-3 border-b pb-3">
            <div className="flex-shrink-0 bg-blue-100 p-2 rounded-full">
              <Tag className="h-4 w-4 text-blue-700" />
            </div>
            <div>
              <h4 className="text-sm font-medium">Классификация</h4>
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {request.aiClassification}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Резюме */}
        {request.summary && (
          <div className="flex items-start gap-3 border-b pb-3">
            <div className="flex-shrink-0 bg-purple-100 p-2 rounded-full">
              <FileText className="h-4 w-4 text-purple-700" />
            </div>
            <div>
              <h4 className="text-sm font-medium">Резюме</h4>
              <p className="text-sm text-gray-700 mt-1">{request.summary}</p>
            </div>
          </div>
        )}

        {/* Рекомендации */}
        {request.aiSuggestion && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 bg-yellow-100 p-2 rounded-full">
              <Lightbulb className="h-4 w-4 text-yellow-700" />
            </div>
            <div>
              <h4 className="text-sm font-medium">Рекомендация</h4>
              <p className="text-sm text-gray-700 mt-1">{request.aiSuggestion}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RequestInsightPanel;