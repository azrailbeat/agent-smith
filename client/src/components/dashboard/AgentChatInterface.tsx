import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ImageIcon, Paperclip, Send, Smile } from 'lucide-react';

interface AgentChatInterfaceProps {
  agentName: string;
  agentStatus?: string;
  avatarUrl?: string;
}

export function AgentChatInterface({ agentName, agentStatus = "в сети", avatarUrl }: AgentChatInterfaceProps) {
  const [message, setMessage] = useState("");

  return (
    <Card className="w-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div className="flex flex-col">
          <CardTitle className="font-medium">{agentName}</CardTitle>
          <p className="text-xs text-green-600">{agentStatus}</p>
        </div>
        <Avatar className="h-10 w-10 border border-gray-200">
          <AvatarImage src={avatarUrl} alt={agentName} />
          <AvatarFallback>{agentName.charAt(0)}</AvatarFallback>
        </Avatar>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-sm">Добрый день! Что я могу для вас сделать сегодня?</p>
        </div>
        
        <div className="relative">
          <Textarea 
            placeholder="Напишите сообщение..." 
            className="resize-none pr-12"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
          <div className="absolute bottom-2 right-2 flex gap-2">
            <Button 
              type="button" 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 rounded-full"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button 
              type="button" 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 rounded-full"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button 
              type="button" 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 rounded-full"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end pt-0">
        <Button 
          disabled={!message.trim()}
          className="gap-1"
          size="sm"
        >
          <Send className="h-4 w-4" />
          Отправить
        </Button>
      </CardFooter>
    </Card>
  );
}

export default AgentChatInterface;