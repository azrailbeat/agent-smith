import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';
import { User, UserCog, Plus, Users, AlertTriangle, Info } from 'lucide-react';
import PositionSelectDialog from './PositionSelectDialog';

// Типы данных
interface Department {
  id: number;
  name: string;
  description: string | null;
  parentId: number | null;
}

interface Position {
  id: number;
  name: string;
  departmentId: number;
  level: number;
}

interface Employee {
  id: number;
  fullName: string;
  positionId: number;
  departmentId: number;
  email?: string;
}

interface DraggableOrgStructureProps {
  departments: Department[];
  positions: Position[];
  employees: Employee[];
  onUpdate: () => void;
}

const DraggableOrgStructure: React.FC<DraggableOrgStructureProps> = ({
  departments,
  positions,
  employees,
  onUpdate
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Организуем данные в иерархию
  const [structuredDepartments, setStructuredDepartments] = useState<any[]>([]);
  
  // Состояния для диалога выбора должности
  const [isPositionDialogOpen, setIsPositionDialogOpen] = useState(false);
  const [employeeToMove, setEmployeeToMove] = useState<{
    id: number;
    name: string;
    sourceDeptId: number;
    destDeptId: number;
  } | null>(null);
  const [availablePositions, setAvailablePositions] = useState<Position[]>([]);
  const [targetDepartment, setTargetDepartment] = useState<Department | null>(null);
  
  useEffect(() => {
    organizeDataIntoHierarchy();
  }, [departments, positions, employees]);

  // Функция для организации данных в иерархическую структуру
  const organizeDataIntoHierarchy = () => {
    // Находим корневые отделы (без родителя)
    const rootDepartments = departments.filter(dept => dept.parentId === null);
    
    // Рекурсивно строим иерархию
    const buildHierarchy = (parentDepartments: Department[]): any[] => {
      return parentDepartments.map(dept => {
        // Находим дочерние отделы
        const childDepartments = departments.filter(d => d.parentId === dept.id);
        // Находим должности отдела
        const deptPositions = positions.filter(pos => pos.departmentId === dept.id);
        // Находим сотрудников отдела
        const deptEmployees = employees.filter(emp => emp.departmentId === dept.id);
        
        return {
          ...dept,
          childDepartments: buildHierarchy(childDepartments),
          positions: deptPositions,
          employees: deptEmployees
        };
      });
    };
    
    const hierarchy = buildHierarchy(rootDepartments);
    setStructuredDepartments(hierarchy);
  };

  // Мутация для обновления принадлежности сотрудника к отделу
  const moveEmployeeMutation = useMutation({
    mutationFn: async ({ employeeId, newDepartmentId, newPositionId }: { employeeId: number, newDepartmentId: number, newPositionId: number }) => {
      return apiRequest('PATCH', `/api/employees/${employeeId}`, {
        departmentId: newDepartmentId,
        positionId: newPositionId
      });
    },
    onSuccess: () => {
      toast({
        title: 'Сотрудник перемещен',
        description: 'Сотрудник успешно перемещен в новый отдел и назначен на должность.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      onUpdate();
    },
    onError: (error) => {
      toast({
        title: 'Ошибка при перемещении',
        description: 'Не удалось переместить сотрудника. Пожалуйста, попробуйте снова.',
        variant: 'destructive',
      });
      console.error('Error moving employee:', error);
    },
  });

  // Обработчик выбора должности
  const handlePositionSelect = (positionId: number) => {
    if (employeeToMove) {
      moveEmployeeMutation.mutate({
        employeeId: employeeToMove.id,
        newDepartmentId: employeeToMove.destDeptId,
        newPositionId: positionId
      });
      
      // Закрываем диалог
      setIsPositionDialogOpen(false);
      setEmployeeToMove(null);
      setAvailablePositions([]);
      setTargetDepartment(null);
    }
  };

  // Обработчик завершения перетаскивания
  const handleDragEnd = (result: any) => {
    const { source, destination, draggableId } = result;
    
    // Если нет destination или перетаскивание внутри того же списка без изменения положения
    if (!destination || 
        (source.droppableId === destination.droppableId && 
        source.index === destination.index)) {
      return;
    }
    
    // Перетаскивание сотрудника между отделами
    if (result.type === 'EMPLOYEE') {
      const employeeId = parseInt(draggableId.split('-')[1]);
      const sourceDeptId = parseInt(source.droppableId.split('-')[1]);
      const destDeptId = parseInt(destination.droppableId.split('-')[1]);
      
      // Найдем сотрудника и отдел
      const employee = employees.find(emp => emp.id === employeeId);
      const dept = departments.find(d => d.id === destDeptId);
      
      if (!employee || !dept) return;
      
      const departmentPositions = positions.filter(pos => pos.departmentId === destDeptId);
      
      if (departmentPositions.length === 0) {
        toast({
          title: 'Невозможно переместить',
          description: 'В целевом отделе нет доступных должностей для назначения сотрудника.',
          variant: 'destructive',
        });
        return;
      }
      
      // Открываем диалог выбора должности
      setEmployeeToMove({
        id: employeeId,
        name: employee.fullName,
        sourceDeptId,
        destDeptId
      });
      setAvailablePositions(departmentPositions);
      setTargetDepartment(dept);
      setIsPositionDialogOpen(true);
    }
  };

  // Рекурсивный рендеринг отделов и сотрудников
  const renderDepartment = (department: any, level: number = 0) => {
    return (
      <div key={`dept-${department.id}`} className="mb-4">
        <Card className={`border-l-4 ${level === 0 ? 'border-l-blue-600' : 'border-l-blue-400'}`}>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-lg flex items-center">
              <Users className="h-5 w-5 mr-2" />
              {department.name}
              <Badge variant="outline" className="ml-2">
                {department.employees.length} сотрудников
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {department.description && (
              <p className="text-sm text-muted-foreground mb-3">{department.description}</p>
            )}
            
            <Droppable droppableId={`dept-${department.id}`} type="EMPLOYEE">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`p-2 rounded-md min-h-[50px] transition-colors ${
                    snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-gray-50'
                  }`}
                >
                  {department.employees.length > 0 ? (
                    department.employees.map((emp: Employee, index: number) => {
                      const empPosition = positions.find(pos => pos.id === emp.positionId);
                      return (
                        <Draggable 
                          key={`emp-${emp.id}`} 
                          draggableId={`emp-${emp.id}`} 
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`mb-2 p-2 rounded border ${
                                snapshot.isDragging 
                                  ? 'border-blue-400 bg-blue-50 shadow-lg' 
                                  : 'border-gray-200 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                                    <User className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{emp.fullName}</div>
                                    <div className="text-xs text-gray-500">
                                      {empPosition ? empPosition.name : 'Нет должности'}
                                    </div>
                                  </div>
                                </div>
                                <UserCog className="h-4 w-4 text-gray-400" />
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })
                  ) : (
                    <div className="flex items-center justify-center p-4 text-muted-foreground">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      <span className="text-sm">Нет сотрудников</span>
                    </div>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {department.childDepartments && department.childDepartments.length > 0 && (
              <div className="mt-4 pl-4 border-l border-gray-200">
                {department.childDepartments.map((childDept: any) => 
                  renderDepartment(childDept, level + 1)
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="org-structure-drag-drop">
      <div className="mb-4 p-4 bg-blue-50 rounded border border-blue-200">
        <h3 className="text-sm font-medium flex items-center mb-2">
          <Info className="h-4 w-4 mr-2" />
          Инструкция
        </h3>
        <p className="text-sm text-muted-foreground">
          Перетащите сотрудника в другой отдел, чтобы изменить его принадлежность. 
          При перемещении вам будет предложено выбрать должность. 
          Изменения сохраняются автоматически.
        </p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div>
          {structuredDepartments.map(dept => renderDepartment(dept))}
        </div>
      </DragDropContext>

      {/* Диалог выбора должности */}
      {isPositionDialogOpen && targetDepartment && employeeToMove && (
        <PositionSelectDialog
          isOpen={isPositionDialogOpen}
          positions={availablePositions}
          onClose={() => {
            setIsPositionDialogOpen(false);
            setEmployeeToMove(null);
            setAvailablePositions([]);
            setTargetDepartment(null);
          }}
          onPositionSelect={handlePositionSelect}
          employeeName={employeeToMove.name}
          departmentName={targetDepartment.name}
        />
      )}
    </div>
  );
};

export default DraggableOrgStructure;