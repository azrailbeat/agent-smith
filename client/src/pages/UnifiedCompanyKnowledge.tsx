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
  const [activeTab, setActiveTab] = useState("structure");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAddDepartmentDialogOpen, setIsAddDepartmentDialogOpen] = useState(false);

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Управление организационной структурой</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddDepartmentDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> Добавить правило
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
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