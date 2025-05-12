import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from '@hello-pangea/dnd';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import RequestInsightPanel from '@/components/RequestInsightPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { RequestView } from '@/components/RequestView';
import { RequestDetailsCard } from '@/components/RequestDetailsCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import IntegrationSettings from '@/components/integration/IntegrationSettings';
import { TrelloStyleRequestCard } from '@/components/TrelloStyleRequestCard';
import { AutoProcessDialog } from '@/components/AutoProcessDialog';
import {
  ChevronDown,
  Plus,
  Filter,
  MoreHorizontal,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Folder,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';

// Упрощенная версия компонента для тестирования
const CitizenRequests = () => {
  const { toast } = useToast();
  
  // Состояние
  const [formData, setFormData] = useState({
    fullName: '',
    contactInfo: '',
    requestType: 'complaint',
    subject: '',
    description: '',
  });
  
  // Состояние для отображения диалогов
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('list');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Здесь должен быть код для отправки запроса
    setIsNewRequestOpen(false);
  };
  
  const handleBatchProcess = (selectedRequests) => {
    console.log('Processing batch:', selectedRequests);
    setIsBatchDialogOpen(false);
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Обращения граждан</h1>
        <Button onClick={() => setIsNewRequestOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Новое обращение
        </Button>
      </div>
      
      <div className="flex-grow p-4">
        <p>Упрощенная версия для тестирования</p>
      </div>
      
      <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Новое обращение</DialogTitle>
            <DialogDescription>
              Заполните форму для создания нового обращения гражданина
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="fullName">ФИО</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="contactInfo">Контактная информация</Label>
                  <Input
                    id="contactInfo"
                    name="contactInfo"
                    value={formData.contactInfo}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="requestType">Тип обращения</Label>
                  <Select
                    name="requestType"
                    value={formData.requestType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, requestType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип обращения" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="complaint">Жалоба</SelectItem>
                      <SelectItem value="proposal">Предложение</SelectItem>
                      <SelectItem value="question">Вопрос</SelectItem>
                      <SelectItem value="gratitude">Благодарность</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="subject">Тема обращения</Label>
                  <Input
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={5}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewRequestOpen(false)}>
                Отмена
              </Button>
              <Button type="submit">Создать обращение</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CitizenRequests;