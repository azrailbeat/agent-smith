import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Task, FormattedTask } from "@/lib/types";
import { format, isPast, isToday } from "date-fns";
import { CalendarIcon, InfoIcon, AlertCircleIcon, CheckCircleIcon } from "lucide-react";
import { ru } from "date-fns/locale";

// Helper function to format tasks
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

interface TasksListProps {
  limit?: number;
}

const TasksList = ({ limit = 5 }: TasksListProps) => {
  const { data, isLoading, error } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });

  if (isLoading) {
    return (
      <Card className="bg-white shadow mb-6">
        <CardHeader>
          <CardTitle>Активные задачи</CardTitle>
          <CardDescription>Загрузка...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
                <div className="h-3 bg-neutral-200 rounded w-1/4 mt-4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white shadow mb-6">
        <CardHeader>
          <CardTitle>Активные задачи</CardTitle>
          <CardDescription>Ошибка загрузки данных</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4 text-red-500">
            <AlertCircleIcon className="mr-2" />
            <span>Не удалось загрузить список задач</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formattedTasks = formatTasks(data || []).slice(0, limit);

  if (formattedTasks.length === 0) {
    return (
      <Card className="bg-white shadow mb-6">
        <CardHeader>
          <CardTitle>Активные задачи</CardTitle>
          <CardDescription>Нет активных задач</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-center text-neutral-600">
              У вас нет активных задач в данный момент
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow mb-6">
      <CardHeader className="border-b border-neutral-200">
        <CardTitle>Активные задачи</CardTitle>
        <CardDescription>
          Список текущих задач, требующих вашего внимания
        </CardDescription>
      </CardHeader>
      <div className="divide-y divide-neutral-200">
        {formattedTasks.map((task) => (
          <a 
            key={task.id} 
            href={`/tasks/${task.id}`} 
            className="block hover:bg-neutral-50"
          >
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-primary-600 truncate">
                  {task.title}
                </div>
                <div className="ml-2 flex-shrink-0 flex">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${task.statusBadge.color}`}>
                    {task.statusBadge.text}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex justify-between">
                <div className="sm:flex">
                  <div className="mr-6 flex items-center text-sm text-neutral-500">
                    <CalendarIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-neutral-400" />
                    {task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) 
                      ? <span className="text-red-500">Просрочено: {task.dueDateFormatted}</span>
                      : `Срок: ${task.dueDateFormatted}`
                    }
                  </div>
                  <div className="mt-2 sm:mt-0 flex items-center text-sm text-neutral-500">
                    <InfoIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-neutral-400" />
                    {task.documentCount > 0 
                      ? `${task.documentCount} ${task.documentCount === 1 ? 'документ' : 
                          task.documentCount < 5 ? 'документа' : 'документов'}`
                      : 'Нет документов'
                    }
                  </div>
                </div>
                <div className="flex items-center text-sm text-neutral-500">
                  {task.aiProgress > 0 && (
                    <>
                      <AlertCircleIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-neutral-400" />
                      AI-анализ: {task.aiProgress}% завершен
                    </>
                  )}
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
      <CardFooter className="px-4 py-3 border-t border-neutral-200 bg-neutral-50 text-right">
        <a href="/tasks" className="text-sm font-medium text-primary-600 hover:text-primary-500">
          Показать все задачи
          <span aria-hidden="true">&rarr;</span>
        </a>
      </CardFooter>
    </Card>
  );
};

export default TasksList;
