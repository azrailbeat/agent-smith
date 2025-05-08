import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, Grip, Plus, MoveUp, MoveDown } from "lucide-react";

// Интерфейс для поля формы
export interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  defaultValue?: string;
}

interface FormFieldEditorProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

const FormFieldEditor: React.FC<FormFieldEditorProps> = ({ fields, onChange }) => {
  // Добавление нового поля
  const addField = () => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type: "text",
      label: "Новое поле",
      placeholder: "Введите значение",
      required: false,
    };
    
    onChange([...fields, newField]);
  };

  // Удаление поля
  const removeField = (id: string) => {
    onChange(fields.filter(field => field.id !== id));
  };

  // Обновление поля
  const updateField = (id: string, updates: Partial<FormField>) => {
    onChange(
      fields.map(field => 
        field.id === id ? { ...field, ...updates } : field
      )
    );
  };

  // Обработчик для drag-and-drop
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    onChange(items);
  };

  // Перемещение поля вверх
  const moveFieldUp = (index: number) => {
    if (index === 0) return;
    
    const items = Array.from(fields);
    const item = items[index];
    items[index] = items[index - 1];
    items[index - 1] = item;
    
    onChange(items);
  };

  // Перемещение поля вниз
  const moveFieldDown = (index: number) => {
    if (index === fields.length - 1) return;
    
    const items = Array.from(fields);
    const item = items[index];
    items[index] = items[index + 1];
    items[index + 1] = item;
    
    onChange(items);
  };

  return (
    <div className="space-y-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="fields">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-3"
            >
              {fields.map((field, index) => (
                <Draggable key={field.id} draggableId={field.id} index={index}>
                  {(provided) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="border-2 border-dashed"
                    >
                      <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between">
                        <div {...provided.dragHandleProps} className="cursor-grab">
                          <Grip className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => moveFieldUp(index)}
                            disabled={index === 0}
                          >
                            <MoveUp className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => moveFieldDown(index)}
                            disabled={index === fields.length - 1}
                          >
                            <MoveDown className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeField(field.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor={`field-type-${field.id}`}>Тип поля</Label>
                            <Select
                              value={field.type}
                              onValueChange={(value) => updateField(field.id, { type: value })}
                            >
                              <SelectTrigger id={`field-type-${field.id}`}>
                                <SelectValue placeholder="Выберите тип поля" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Текстовое поле</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="tel">Телефон</SelectItem>
                                <SelectItem value="textarea">Многострочное поле</SelectItem>
                                <SelectItem value="select">Выпадающий список</SelectItem>
                                <SelectItem value="checkbox">Флажок</SelectItem>
                                <SelectItem value="date">Дата</SelectItem>
                                <SelectItem value="number">Число</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`field-label-${field.id}`}>Заголовок</Label>
                            <Input
                              id={`field-label-${field.id}`}
                              value={field.label}
                              onChange={(e) => updateField(field.id, { label: e.target.value })}
                            />
                          </div>
                        </div>
                        
                        <div className="mt-3 space-y-2">
                          <Label htmlFor={`field-placeholder-${field.id}`}>Подсказка</Label>
                          <Input
                            id={`field-placeholder-${field.id}`}
                            value={field.placeholder || ""}
                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                          />
                        </div>
                        
                        {field.type === "select" && (
                          <div className="mt-3 space-y-2">
                            <Label htmlFor={`field-options-${field.id}`}>Варианты (через запятую)</Label>
                            <Input
                              id={`field-options-${field.id}`}
                              value={field.options ? field.options.join(", ") : ""}
                              onChange={(e) => updateField(field.id, { 
                                options: e.target.value.split(",").map(opt => opt.trim()).filter(Boolean)
                              })}
                            />
                          </div>
                        )}
                        
                        <div className="mt-3 flex items-center space-x-2">
                          <Switch
                            id={`field-required-${field.id}`}
                            checked={field.required}
                            onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                          />
                          <Label htmlFor={`field-required-${field.id}`}>Обязательное поле</Label>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      
      <Button onClick={addField} className="w-full">
        <Plus className="mr-2 h-4 w-4" /> Добавить поле
      </Button>
    </div>
  );
};

export default FormFieldEditor;