import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Position {
  id: number;
  name: string;
  departmentId: number;
  level: number;
}

interface PositionSelectDialogProps {
  isOpen: boolean;
  positions: Position[];
  onClose: () => void;
  onPositionSelect: (positionId: number) => void;
  employeeName: string;
  departmentName: string;
}

const PositionSelectDialog: React.FC<PositionSelectDialogProps> = ({
  isOpen,
  positions,
  onClose,
  onPositionSelect,
  employeeName,
  departmentName,
}) => {
  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(
    positions.length > 0 ? positions[0].id : null
  );

  const handleSelectPosition = () => {
    if (selectedPositionId !== null) {
      onPositionSelect(selectedPositionId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Выбор должности</DialogTitle>
          <DialogDescription>
            Выберите должность для сотрудника {employeeName} в отделе {departmentName}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="position">Должность</Label>
              <Select
                value={selectedPositionId?.toString() || ''}
                onValueChange={(value) => setSelectedPositionId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите должность" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((position) => (
                    <SelectItem key={position.id} value={position.id.toString()}>
                      {position.name} (Уровень: {position.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSelectPosition} disabled={selectedPositionId === null}>
            Назначить должность
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PositionSelectDialog;