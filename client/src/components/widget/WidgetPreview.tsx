import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormField } from "./FormFieldEditor";

interface WidgetPreviewProps {
  title: string;
  subtitle: string;
  fields: FormField[];
  primaryColor: string;
  theme: string;
}

const WidgetPreview: React.FC<WidgetPreviewProps> = ({
  title,
  subtitle,
  fields,
  primaryColor,
  theme,
}) => {
  // Определяем CSS-классы на основе темы
  const isDark = theme === "dark";
  const bgColor = isDark ? "bg-gray-900" : "bg-white";
  const textColor = isDark ? "text-white" : "text-gray-900";
  const borderColor = isDark ? "border-gray-700" : "border-gray-200";
  
  return (
    <Card className={`overflow-hidden ${bgColor} ${textColor} ${borderColor}`}>
      <div
        style={{ backgroundColor: primaryColor }}
        className="px-4 py-3 text-white"
      >
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-sm opacity-90">{subtitle}</p>
      </div>
      <CardContent className="p-4 space-y-4">
        {fields.map((field) => (
          <div key={field.id} className="space-y-2">
            <Label 
              htmlFor={`preview-${field.id}`}
              className="flex items-center"
            >
              {field.label}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </Label>
            
            {field.type === "text" && (
              <Input
                id={`preview-${field.id}`}
                placeholder={field.placeholder}
                disabled
              />
            )}
            
            {field.type === "email" && (
              <Input
                id={`preview-${field.id}`}
                type="email"
                placeholder={field.placeholder}
                disabled
              />
            )}
            
            {field.type === "tel" && (
              <Input
                id={`preview-${field.id}`}
                type="tel"
                placeholder={field.placeholder}
                disabled
              />
            )}
            
            {field.type === "textarea" && (
              <Textarea
                id={`preview-${field.id}`}
                placeholder={field.placeholder}
                disabled
                rows={3}
              />
            )}
            
            {field.type === "select" && (
              <select
                id={`preview-${field.id}`}
                disabled
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{field.placeholder || "Выберите..."}</option>
                {field.options?.map((option, idx) => (
                  <option key={idx} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
            
            {field.type === "checkbox" && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`preview-${field.id}`}
                  disabled
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label
                  htmlFor={`preview-${field.id}`}
                  className="text-sm"
                >
                  {field.placeholder || "Я согласен"}
                </label>
              </div>
            )}
            
            {field.type === "date" && (
              <Input
                id={`preview-${field.id}`}
                type="date"
                disabled
              />
            )}
            
            {field.type === "number" && (
              <Input
                id={`preview-${field.id}`}
                type="number"
                placeholder={field.placeholder}
                disabled
              />
            )}
          </div>
        ))}
        
        <Button 
          className="w-full mt-4"
          style={{ backgroundColor: primaryColor }}
          disabled
        >
          Отправить
        </Button>
      </CardContent>
    </Card>
  );
};

export default WidgetPreview;