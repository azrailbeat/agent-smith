import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Task, FormattedTask } from "@/lib/types";
import { CheckCircle, AlertCircle, Clock, Calendar } from "lucide-react";
import { isPast, isToday } from "date-fns";

const Tasks = () => {
  const { data: tasksData, isLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });

  // Format tasks for display
  const formatTasks = (tasks: Task[]): FormattedTask[] => {
    return tasks.map(task => {
      // Formatted due date
      const dueDateFormatted = task.dueDate
        ? isToday(new Date(task.dueDate))
          ? "Сегодня"
          : format(new Date(task.dueDate), "d MMMM", { locale: ru })
        : "Не указано";

      // Status badge
      let statusBadge = {
        color: "bg-neutral-100 text-neutral-800",
        text: "Ожидает"
      };

      switch (task.status) {
        case "in_progress":
          statusBadge = {
            color: "bg-yellow-100 text-yellow-800",
            text: "В процессе"
          };
          break;
        case "ready_for_review":
          statusBadge = {
            color: "bg-green-100 text-green-800",
            text: "Готово к проверке"
          };
          break;
        case "completed":
          statusBadge = {
            color: "bg-blue-100 text-blue-800",
            text: "Завершено"
          };
          break;
        case "requires_attention":
          statusBadge = {
            color: "bg-red-100 text-red-800",
            text: "Требует внимания"
          };
          break;
      }

      // Priority badge
      let priorityBadge = {
        color: "bg-neutral-100 text-neutral-800",
        text: "Обычный"
      };

      switch (task.priority) {
        case "low":
          priorityBadge = {
            color: "bg-blue-100 text-blue-800",
            text: "Низкий"
          };
          break;
        case "medium":
          priorityBadge = {
            color: "bg-green-100 text-green-800",
            text: "Средний"
          };
          break;
        case "high":
          priorityBadge = {
            color: "bg-yellow-100 text-yellow-800",
            text: "Высокий"
          };
          break;
        case "urgent":
          priorityBadge = {
            color: "bg-red-100 text-red-800",
            text: "Срочный"
          };
          break;
      }

      return {
        ...task,
        dueDateFormatted,
        statusBadge,
        priorityBadge,
      };
    });
  };

  const tasks = isLoading ? [] : formatTasks(tasksData || []);

  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Мои задачи</h1>
            <p className="mt-2 text-sm text-neutral-700">
              Всего задач: {isLoading ? "..." : tasks.length}
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button className="inline-flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Новая задача
            </Button>
          </div>
        </div>
      </div>

      {/* Tasks table */}
      <Card>
        <CardHeader>
          <CardTitle>Список задач</CardTitle>
          <CardDescription>
            Управление задачами и их статусом
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-neutral-100 rounded"></div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">Нет активных задач</h3>
              <p className="text-neutral-500 text-center max-w-md">
                У вас нет активных задач в данный момент. Создайте новую задачу, чтобы начать работу.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Приоритет</TableHead>
                  <TableHead>Срок</TableHead>
                  <TableHead>Документы</TableHead>
                  <TableHead>Прогресс</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id} className="hover:bg-neutral-50 cursor-pointer" onClick={() => window.location.href = `/tasks/${task.id}`}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>
                      <Badge className={task.statusBadge.color}>
                        {task.statusBadge.text}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={task.priorityBadge.color}>
                        {task.priorityBadge.text}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.dueDate && (
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-neutral-500" />
                          <span className={`${
                            task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) 
                              ? 'text-red-500' 
                              : ''
                          }`}>
                            {task.dueDateFormatted}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {task.documentCount > 0 ? task.documentCount : "Нет"}
                    </TableCell>
                    <TableCell>
                      {task.aiProgress > 0 ? (
                        <div className="flex items-center">
                          <span className="mr-2">{task.aiProgress}%</span>
                          <div className="w-20 bg-neutral-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                task.aiProgress > 90 
                                  ? 'bg-green-500' 
                                  : task.aiProgress > 40 
                                    ? 'bg-yellow-500' 
                                    : 'bg-red-500'
                              }`} 
                              style={{ width: `${task.aiProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : "Не начат"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default Tasks;
