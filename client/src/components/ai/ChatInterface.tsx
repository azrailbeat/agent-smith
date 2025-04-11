import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Message, User } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  SendIcon, 
  PaperclipIcon, 
  ImageIcon,
  FileIcon,
  MicIcon,
  EyeIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatInterfaceProps {
  taskId?: number;
  currentUser: User;
}

const ChatInterface = ({ taskId, currentUser }: ChatInterfaceProps) => {
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch messages if taskId is provided
  const messagesQuery = useQuery<Message[]>({
    queryKey: taskId ? [`/api/tasks/${taskId}/messages`] : ['/api/messages'],
    enabled: !!taskId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const payload = {
        userId: currentUser.id,
        role: "user",
        content: messageText,
        taskId
      };
      
      return apiRequest("POST", "/api/messages", payload);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setMessage("");
      
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/messages`] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      }
      
      // Show toast for AI response
      if (data.aiResponse) {
        toast({
          title: "Ответ получен",
          description: "Agent Smith обработал ваш запрос",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось отправить сообщение: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessageMutation.mutate(message);
    }
  };

  // Default messages if none are loaded yet
  const defaultMessages: Message[] = [
    {
      id: 0,
      role: "assistant",
      content: "Добрый день! Что я могу для вас сделать сегодня?",
      timestamp: new Date()
    }
  ];

  const messages = messagesQuery.data || defaultMessages;
  const isLoadingMessages = messagesQuery.isLoading;
  const isSendingMessage = sendMessageMutation.isPending;

  return (
    <Card className="bg-white shadow rounded-lg overflow-hidden">
      <CardHeader className="px-4 py-5 border-b border-neutral-200 sm:px-6 flex justify-between items-center">
        <CardTitle>Agent Smith</CardTitle>
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
          В сети
        </Badge>
      </CardHeader>
      
      <CardContent className="px-4 py-5 h-80 overflow-y-auto">
        {isLoadingMessages ? (
          <div className="flex flex-col space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse flex">
                <div className="rounded-full bg-neutral-200 h-10 w-10"></div>
                <div className="ml-3 flex-1">
                  <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2"></div>
                  <div className="h-20 bg-neutral-200 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : ''}`}
              >
                {msg.role !== 'user' && (
                  <div className="flex-shrink-0 mr-3">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <EyeIcon className="h-6 w-6 text-primary-600" />
                    </div>
                  </div>
                )}
                
                <div className={`flex-1 ${
                  msg.role === 'user' 
                    ? 'bg-primary-50 ml-12' 
                    : 'bg-neutral-100'
                  } rounded-lg px-4 py-2 sm:px-6 sm:py-4`}
                >
                  <div className="text-sm">
                    <p className="font-medium text-neutral-900">
                      {msg.role === 'user' ? 'Вы' : 'Agent Smith'}
                    </p>
                  </div>
                  <div className="mt-1 text-sm text-neutral-700">
                    <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                    {msg.content.includes("•") && (
                      <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                        {msg.content
                          .split("\n")
                          .filter(line => line.trim().startsWith("•"))
                          .map((line, idx) => (
                            <li key={idx}>{line.replace("•", "").trim()}</li>
                          ))}
                      </ul>
                    )}
                  </div>
                </div>
                
                {msg.role === 'user' && (
                  <div className="flex-shrink-0 ml-3">
                    {currentUser.avatarUrl ? (
                      <img 
                        className="h-10 w-10 rounded-full" 
                        src={currentUser.avatarUrl} 
                        alt={currentUser.fullName} 
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-medium">
                          {currentUser.fullName.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {isSendingMessage && (
              <div className="flex">
                <div className="flex-shrink-0 mr-3">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <EyeIcon className="h-6 w-6 text-primary-600" />
                  </div>
                </div>
                <div className="flex-1 bg-neutral-100 rounded-lg px-4 py-2 sm:px-6 sm:py-4">
                  <div className="text-sm">
                    <p className="font-medium text-neutral-900">Agent Smith</p>
                  </div>
                  <div className="mt-1 text-sm text-neutral-700 flex items-center">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 bg-primary-600 rounded-full animate-bounce"></div>
                      <div className="h-2 w-2 bg-primary-600 rounded-full animate-bounce delay-150"></div>
                      <div className="h-2 w-2 bg-primary-600 rounded-full animate-bounce delay-300"></div>
                    </div>
                    <p className="ml-2">Обрабатываю запрос...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="px-4 py-4 sm:px-6 border-t border-neutral-200">
        <form className="relative w-full" onSubmit={handleSubmit}>
          <div className="flex">
            <div className="flex-grow">
              <Textarea 
                rows={1} 
                className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" 
                placeholder="Напишите сообщение..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isSendingMessage}
              />
            </div>
            <div className="ml-3 flex-shrink-0">
              <Button 
                type="submit" 
                disabled={!message.trim() || isSendingMessage}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                {isSendingMessage ? "Отправка..." : "Отправить"}
              </Button>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex justify-between py-2 pl-3 pr-2">
            <div className="flex items-center space-x-5">
              <div className="flex items-center">
                <button type="button" className="-m-2.5 flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 hover:text-neutral-900">
                  <PaperclipIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="flex items-center">
                <button type="button" className="-m-2.5 flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 hover:text-neutral-900">
                  <ImageIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="flex items-center">
                <button type="button" className="-m-2.5 flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 hover:text-neutral-900">
                  <FileIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="flex items-center">
                <button type="button" className="-m-2.5 flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 hover:text-neutral-900">
                  <MicIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </form>
      </CardFooter>
    </Card>
  );
};

export default ChatInterface;
