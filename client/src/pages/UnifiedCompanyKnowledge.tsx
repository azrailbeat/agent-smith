import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Building, FileText, Upload, Plus } from "lucide-react";
import { CompanyKnowledge } from "./CompanyKnowledge";
import OrgStructureManagement from "./OrgStructureManagement";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function UnifiedCompanyKnowledge() {
  const [activeTab, setActiveTab] = useState("knowledge");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAddDepartmentDialogOpen, setIsAddDepartmentDialogOpen] = useState(false);

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Организация и База знаний</h1>
        <div className="flex gap-2">
          {activeTab === "knowledge" ? (
            <>
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Загрузить должностную инструкцию
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Создать базу знаний
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsAddDepartmentDialogOpen(true)}>
              <Building className="mr-2 h-4 w-4" /> Добавить подразделение
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="knowledge">
            <FileText className="mr-2 h-4 w-4" /> Базы знаний
          </TabsTrigger>
          <TabsTrigger value="structure">
            <Building className="mr-2 h-4 w-4" /> Организационная структура
          </TabsTrigger>
        </TabsList>

        <TabsContent value="knowledge">
          <CompanyKnowledge standalone={false} />
        </TabsContent>

        <TabsContent value="structure">
          <OrgStructureManagement standalone={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}