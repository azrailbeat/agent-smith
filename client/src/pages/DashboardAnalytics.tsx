import { useState } from "react";
import { LLMMonitoringPanel } from "@/components/analytics/LLMMonitoringPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DashboardAnalytics() {
  const [activeTab, setActiveTab] = useState("llm");
  
  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-4xl font-bold mb-8">Мониторинг системы</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-white border w-full flex justify-start overflow-x-auto hide-scrollbar p-1 mb-6">
          <TabsTrigger
            value="llm"
            className="data-[state=active]:bg-slate-100 data-[state=active]:shadow-none rounded-md py-2 px-3 text-slate-700 text-base"
          >
            LLM Аналитика
          </TabsTrigger>
          <TabsTrigger
            value="server"
            className="data-[state=active]:bg-slate-100 data-[state=active]:shadow-none rounded-md py-2 px-3 text-slate-700 text-base"
          >
            Состояние серверов
          </TabsTrigger>
          <TabsTrigger
            value="database"
            className="data-[state=active]:bg-slate-100 data-[state=active]:shadow-none rounded-md py-2 px-3 text-slate-700 text-base"
          >
            База данных
          </TabsTrigger>
          <TabsTrigger
            value="blockchain"
            className="data-[state=active]:bg-slate-100 data-[state=active]:shadow-none rounded-md py-2 px-3 text-slate-700 text-base"
          >
            Блокчейн
          </TabsTrigger>
        </TabsList>

        <TabsContent value="llm" className="space-y-8">
          <LLMMonitoringPanel />
        </TabsContent>
        
        <TabsContent value="server" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Состояние главного сервера</CardTitle>
                <CardDescription>
                  Мониторинг производительности сервера
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-center text-slate-500">
                    <p>Раздел в разработке</p>
                    <p className="text-sm">Будет доступен в следующем обновлении</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Используемые ресурсы</CardTitle>
                <CardDescription>
                  Мониторинг использования ресурсов
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-center text-slate-500">
                    <p>Раздел в разработке</p>
                    <p className="text-sm">Будет доступен в следующем обновлении</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="database" className="space-y-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Мониторинг базы данных</CardTitle>
              <CardDescription>
                Статистика и производительность базы данных
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <p>Раздел в разработке</p>
                  <p className="text-sm">Будет доступен в следующем обновлении</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="blockchain" className="space-y-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Мониторинг блокчейна</CardTitle>
              <CardDescription>
                Статистика и производительность блокчейн-сети
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <p>Раздел в разработке</p>
                  <p className="text-sm">Будет доступен в следующем обновлении</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}