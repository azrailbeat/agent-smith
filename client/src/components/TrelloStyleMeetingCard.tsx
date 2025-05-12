import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  ListChecks,
  Check,
  FileText,
  ExternalLink,
  FileAudio,
  Clock
} from "lucide-react";

interface Meeting {
  id: number;
  title: string;
  description?: string;
  date: Date;
  duration: number;
  organizer: string;
  participants: string[];
  status: string;
  protocol?: {
    summary: string;
    decisions: string[];
    tasks: any[];
  };
  blockchainHash?: string;
}

interface TrelloStyleMeetingCardProps {
  meeting: Meeting;
  onClick: () => void;
  draggableProps: any;
  dragHandleProps: any;
  innerRef: React.Ref<HTMLDivElement>;
  isDragging: boolean;
  onTranscribeClick?: (e: React.MouseEvent) => void;
  onViewProtocolClick?: (e: React.MouseEvent) => void;
}

const formatDate = (date: Date) => {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day}.${month} ${hours}:${minutes}`;
};

function TrelloStyleMeetingCard({
  meeting,
  onClick,
  draggableProps,
  dragHandleProps,
  innerRef,
  isDragging,
  onTranscribeClick,
  onViewProtocolClick
}: TrelloStyleMeetingCardProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      ref={innerRef}
      {...draggableProps}
      {...dragHandleProps}
      className="mb-2"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Card
        className={`overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer bg-white ${
          isDragging ? "shadow-md opacity-90" : ""
        }`}
        onClick={onClick}
      >
        <div className="p-3">
          <div>
            <h3 className="text-sm font-semibold line-clamp-1">{meeting.title}</h3>
            <div className="mt-1 text-xs text-gray-500 flex items-center">
              <span className="flex-shrink-0">{formatDate(meeting.date)}</span>
              <span className="mx-1">•</span>
              <span className="flex items-center gap-0.5">
                <Clock className="h-3 w-3" /> {meeting.duration} мин
              </span>
            </div>
            <div className="mt-1">
              <Badge variant="outline" className="text-xs px-1.5 py-0 font-normal">
                {meeting.organizer}
              </Badge>
            </div>
          </div>
          
          {meeting.description && (
            <div className="mt-1.5 text-xs text-gray-600 line-clamp-2">
              {meeting.description}
            </div>
          )}
          
          {meeting.protocol?.summary && (
            <div className="mt-1.5 text-xs text-gray-700 bg-gray-50 p-1.5 rounded border border-gray-200 line-clamp-2">
              {meeting.protocol.summary}
            </div>
          )}
          
          <div className="mt-2 flex justify-between items-center">
            <div className="flex items-center space-x-1">
              <Badge variant="outline" className="text-xs flex items-center gap-1 px-1.5 py-0 font-normal">
                <Users className="h-3 w-3" /> {meeting.participants.length}
              </Badge>
              
              {meeting.protocol?.tasks && meeting.protocol.tasks.length > 0 && (
                <Badge variant="outline" className="text-xs flex items-center gap-1 px-1.5 py-0 font-normal">
                  <ListChecks className="h-3 w-3" /> {meeting.protocol.tasks.length}
                </Badge>
              )}
            </div>
            
            <div className="flex gap-1">
              {meeting.blockchainHash && (
                <Badge variant="outline" className="bg-green-50 text-green-700 text-xs px-1.5 py-0 font-normal">
                  <Check className="h-3 w-3 mr-0.5" /> GovChain
                </Badge>
              )}
              
              <div className={`flex gap-1 items-center transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
                {onTranscribeClick && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="h-6 p-0 w-6 hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTranscribeClick(e);
                    }}
                  >
                    <FileAudio className="h-3.5 w-3.5" />
                  </Button>
                )}
                
                {meeting.protocol && onViewProtocolClick && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="h-6 p-0 w-6 hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewProtocolClick(e);
                    }}
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                )}
                
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="h-6 p-0 w-6 hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                  }}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default TrelloStyleMeetingCard;