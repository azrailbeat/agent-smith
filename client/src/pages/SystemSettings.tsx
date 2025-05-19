import React, { useState } from 'react';
import { Shield, Cog, Link2, RefreshCw, Check, X, Users as UsersIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useIntegrationStatus } from '@/hooks/use-integration-status';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import Breadcrumbs from '@/components/Breadcrumbs';
import Users from './Users';
import { useSystemSettings } from '@/hooks/use-system-settings';

// Компонент настроек безопасности
const SecuritySettings = () => {
  const { 
    settings, 
    isLoading, 
    updateSettings 
  } = useSystemSettings();
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>;
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Настройки безопасности
          </CardTitle>
          <CardDescription>
            Параметры безопасности системы Agent Smith
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Секция аутентификации */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Аутентификация</CardTitle>
                <CardDescription>
                  Локальная аутентификация, LDAP/Active Directory, двухфакторная аутентификация
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Локальная аутентификация */}
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Локальная аутентификация</div>
                    <div className="text-sm text-muted-foreground">
                      Встроенная система аутентификации пользователей
                    </div>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={settings?.security.enableLocalAuth}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          security: {
                            ...settings?.security,
                            enableLocalAuth: e.target.checked,
                          }
                        });
                      }}
                    />
                  </div>
                </div>
                
                {/* Импортируем компонент настроек Replit Auth */}
                <div className="mt-6">
                  {/* Компонент для Replit Auth */}
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">Replit Auth</div>
                      <div className="text-sm text-muted-foreground">
                        Аутентификация через сервис Replit Identity
                      </div>
                    </div>
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={settings?.security.enableReplitAuth}
                        onChange={(e) => {
                          updateSettingsMutation.mutate({
                            security: {
                              ...settings?.security,
                              enableReplitAuth: e.target.checked,
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">LDAP/Active Directory</div>
                    <div className="text-sm text-muted-foreground">
                      Интеграция с корпоративным каталогом пользователей
                    </div>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={settings?.security.enableLdapAuth}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          security: {
                            ...settings?.security,
                            enableLdapAuth: e.target.checked,
                          }
                        });
                      }}
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Двухфакторная аутентификация</div>
                    <div className="text-sm text-muted-foreground">
                      Дополнительный слой защиты с помощью второго фактора
                    </div>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={settings?.security.enableTwoFactor}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          security: {
                            ...settings?.security,
                            enableTwoFactor: e.target.checked,
                          }
                        });
                      }}
                    />
                  </div>
                </div>
                
                {settings?.security.enableLdapAuth && (
                  <div className="mt-4 border-t pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">LDAP сервер</label>
                      <input
                        type="text"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        placeholder="ldap://dc.example.com"
                        value={settings?.security.ldapSettings?.server || ''}
                        onChange={(e) => {
                          updateSettingsMutation.mutate({
                            security: {
                              ...settings?.security,
                              ldapSettings: {
                                ...settings?.security.ldapSettings,
                                server: e.target.value
                              }
                            }
                          });
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2 mt-2">
                      <label className="text-sm font-medium">Базовый DN</label>
                      <input
                        type="text"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        placeholder="DC=example,DC=com"
                        value={settings?.security.ldapSettings?.baseDN || ''}
                        onChange={(e) => {
                          updateSettingsMutation.mutate({
                            security: {
                              ...settings?.security,
                              ldapSettings: {
                                ...settings?.security.ldapSettings,
                                baseDN: e.target.value
                              }
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {settings?.security.enableTwoFactor && (
                  <div className="mt-4 border-t pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Метод двухфакторной аутентификации</label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        value={settings?.security.twoFactorMethod || 'app'}
                        onChange={(e) => {
                          updateSettingsMutation.mutate({
                            security: {
                              ...settings?.security,
                              twoFactorMethod: e.target.value
                            }
                          });
                        }}
                      >
                        <option value="app">Приложение-аутентификатор</option>
                        <option value="sms">SMS</option>
                        <option value="email">Email</option>
                      </select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Секция управления доступом (RBAC) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Управление доступом (RBAC)</CardTitle>
                <CardDescription>
                  Управление ролями, правами доступа и разграничение полномочий пользователей в системе. 
                  Интеграция с организационной структурой.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-1 list-disc pl-5">
                  <li>Управление ролями и разрешениями</li>
                  <li>Разграничение доступа к функциям</li>
                  <li>Назначение ролей пользователям</li>
                </ul>
                
                <div className="mt-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">Интеграция с орг. структурой</div>
                      <div className="text-sm text-muted-foreground">
                        Автоматическое назначение ролей на основе позиции в орг. структуре
                      </div>
                    </div>
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={settings?.security.rbacIntegrateWithOrgStructure}
                        onChange={(e) => {
                          updateSettingsMutation.mutate({
                            security: {
                              ...settings?.security,
                              rbacIntegrateWithOrgStructure: e.target.checked,
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                <Button className="w-full mt-4">
                  Управление RBAC
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Секция шифрования */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Шифрование</CardTitle>
                <CardDescription>
                  Настройки шифрования данных и коммуникаций
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Шифрование данных в базе</div>
                    <div className="text-sm text-muted-foreground">
                      Шифрование чувствительных данных в БД
                    </div>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={settings?.security.encryption?.databaseEncryption}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          security: {
                            ...settings?.security,
                            encryption: {
                              ...settings?.security.encryption,
                              databaseEncryption: e.target.checked
                            }
                          }
                        });
                      }}
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Шифрование файлов</div>
                    <div className="text-sm text-muted-foreground">
                      Шифрование загруженных файлов и документов
                    </div>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={settings?.security.encryption?.fileEncryption}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          security: {
                            ...settings?.security,
                            encryption: {
                              ...settings?.security.encryption,
                              fileEncryption: e.target.checked
                            }
                          }
                        });
                      }}
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Принудительный HTTPS</div>
                    <div className="text-sm text-muted-foreground">
                      Перенаправление всех запросов на HTTPS
                    </div>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={settings?.security.encryption?.forceHttps}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          security: {
                            ...settings?.security,
                            encryption: {
                              ...settings?.security.encryption,
                              forceHttps: e.target.checked
                            }
                          }
                        });
                      }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2 mt-2">
                  <label className="text-sm font-medium">Алгоритм шифрования</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={settings?.security.encryption?.algorithm || 'aes-256-gcm'}
                    onChange={(e) => {
                      updateSettingsMutation.mutate({
                        security: {
                          ...settings?.security,
                          encryption: {
                            ...settings?.security.encryption,
                            algorithm: e.target.value
                          }
                        }
                      });
                    }}
                  >
                    <option value="aes-256-gcm">AES-256-GCM</option>
                    <option value="aes-256-cbc">AES-256-CBC</option>
                    <option value="chacha20-poly1305">ChaCha20-Poly1305</option>
                  </select>
                </div>
              </CardContent>
            </Card>
            
            {/* Секция аудита */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Аудит</CardTitle>
                <CardDescription>
                  Настройки аудита и журналирования действий
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Аудит действий пользователей</div>
                    <div className="text-sm text-muted-foreground">
                      Журналирование всех действий пользователей
                    </div>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={settings?.security.audit?.userActions}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          security: {
                            ...settings?.security,
                            audit: {
                              ...settings?.security.audit,
                              userActions: e.target.checked
                            }
                          }
                        });
                      }}
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Аудит системных событий</div>
                    <div className="text-sm text-muted-foreground">
                      Журналирование системных событий и ошибок
                    </div>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={settings?.security.audit?.systemEvents}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          security: {
                            ...settings?.security,
                            audit: {
                              ...settings?.security.audit,
                              systemEvents: e.target.checked
                            }
                          }
                        });
                      }}
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Запись в блокчейн</div>
                    <div className="text-sm text-muted-foreground">
                      Запись критических действий в блокчейн
                    </div>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={settings?.security.audit?.blockchainAudit}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          security: {
                            ...settings?.security,
                            audit: {
                              ...settings?.security.audit,
                              blockchainAudit: e.target.checked
                            }
                          }
                        });
                      }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2 mt-2">
                  <label className="text-sm font-medium">Период хранения журналов (дней)</label>
                  <input
                    type="number"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={settings?.security.audit?.retentionPeriod || 90}
                    onChange={(e) => {
                      updateSettingsMutation.mutate({
                        security: {
                          ...settings?.security,
                          audit: {
                            ...settings?.security.audit,
                            retentionPeriod: parseInt(e.target.value)
                          }
                        }
                      });
                    }}
                    min="1"
                    max="3650"
                  />
                </div>
                
                <Button className="w-full mt-2" variant="outline">
                  Просмотр журнала аудита
                </Button>
              </CardContent>
            </Card>
          </div>
          
          {/* Секция блокчейн */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Блокчейн</CardTitle>
              <CardDescription>
                Настройки блокчейна для обеспечения неизменности записей
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm">
                Система использует Hyperledger Besu для хранения криптографически защищенных записей. 
                Записи в блокчейне обеспечивают неизменность и подлинность данных.
              </div>
              
              <div className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Включено</div>
                    <div className="text-sm text-muted-foreground">
                      Использование блокчейна для критических операций
                    </div>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={settings?.security.blockchain?.enabled}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          security: {
                            ...settings?.security,
                            blockchain: {
                              ...settings?.security.blockchain,
                              enabled: e.target.checked
                            }
                          }
                        });
                      }}
                    />
                  </div>
                </div>
                
                {settings?.security.blockchain?.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">URL узла блокчейна</label>
                      <input
                        type="text"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        placeholder="http://hyperledger-node:8545"
                        value={settings?.security.blockchain?.nodeUrl || ''}
                        onChange={(e) => {
                          updateSettingsMutation.mutate({
                            security: {
                              ...settings?.security,
                              blockchain: {
                                ...settings?.security.blockchain,
                                nodeUrl: e.target.value
                              }
                            }
                          });
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Адрес контракта аудита</label>
                      <input
                        type="text"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        placeholder="0x..."
                        value={settings?.security.blockchain?.auditContractAddress || ''}
                        onChange={(e) => {
                          updateSettingsMutation.mutate({
                            security: {
                              ...settings?.security,
                              blockchain: {
                                ...settings?.security.blockchain,
                                auditContractAddress: e.target.value
                              }
                            }
                          });
                        }}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">Записывать обращения граждан</div>
                        <div className="text-sm text-muted-foreground">
                          Сохранение хешей обращений граждан в блокчейн
                        </div>
                      </div>
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={settings?.security.blockchain?.recordCitizenRequests}
                          onChange={(e) => {
                            updateSettingsMutation.mutate({
                              security: {
                                ...settings?.security,
                                blockchain: {
                                  ...settings?.security.blockchain,
                                  recordCitizenRequests: e.target.checked
                                }
                              }
                            });
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">Записывать ключевые документы</div>
                        <div className="text-sm text-muted-foreground">
                          Сохранение хешей важных документов в блокчейн
                        </div>
                      </div>
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={settings?.security.blockchain?.recordKeyDocuments}
                          onChange={(e) => {
                            updateSettingsMutation.mutate({
                              security: {
                                ...settings?.security,
                                blockchain: {
                                  ...settings?.security.blockchain,
                                  recordKeyDocuments: e.target.checked
                                }
                              }
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-2 mt-4">
                  <Button className="flex-grow" variant="outline">
                    Проверить соединение
                  </Button>
                  <Button className="flex-grow" variant="outline">
                    Просмотр записей блокчейна
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

// Компонент настроек интеграций
const IntegrationsSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Используем хук для отслеживания статуса интеграций
  const { integrationStatus, checkIntegrationStatus, isChecking: isCheckingStatus } = useIntegrationStatus();
  
  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ['/api/system/settings'],
  });
  
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial<SystemSettings>) => {
      return apiRequest('PATCH', '/api/system/settings', newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system/settings'] });
      toast({
        title: 'Настройки интеграций обновлены',
        description: 'Изменения были успешно сохранены',
      });
      // Проверяем статус после обновления настроек
      checkIntegrationStatus();
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить настройки интеграций',
        variant: 'destructive',
      });
    },
  });
  
  // Состояние для отслеживания активной вкладки интеграций
  const [activeIntegrationTab, setActiveIntegrationTab] = useState<string>('api-eotinish');
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>;
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl flex items-center">
                <Link2 className="mr-2 h-5 w-5" />
                Настройки интеграций
              </CardTitle>
              <CardDescription>
                Управление внешними интеграциями и подключениями к API
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={checkIntegrationStatus}
              disabled={isCheckingStatus}
            >
              <RefreshCw className={`h-4 w-4 ${isCheckingStatus ? 'animate-spin' : ''}`} />
              Проверить все подключения
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Вкладки для разных типов интеграций */}
          <div className="flex space-x-2 border-b pb-2">
            <button 
              className={`px-4 py-2 text-sm rounded-md ${activeIntegrationTab === 'email' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              onClick={() => setActiveIntegrationTab('email')}
            >
              Настройки Email
            </button>
            <button 
              className={`px-4 py-2 text-sm rounded-md ${activeIntegrationTab === 'active-directory' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              onClick={() => setActiveIntegrationTab('active-directory')}
            >
              Active Directory
            </button>
            <button 
              className={`px-4 py-2 text-sm rounded-md ${activeIntegrationTab === 'api-eotinish' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              onClick={() => setActiveIntegrationTab('api-eotinish')}
            >
              API для обращений
            </button>
            <button 
              className={`px-4 py-2 text-sm rounded-md ${activeIntegrationTab === 'widget' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              onClick={() => setActiveIntegrationTab('widget')}
            >
              Виджет для сайта
            </button>
            <button 
              className={`px-4 py-2 text-sm rounded-md ${activeIntegrationTab === 'html-forms' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              onClick={() => setActiveIntegrationTab('html-forms')}
            >
              HTML формы
            </button>
          </div>
          
          {/* Информационный блок */}
          <Card className="bg-muted/30">
            <CardContent className="p-4 flex">
              <div className="w-6 h-6 mr-2 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              </div>
              <p className="text-sm">
                {activeIntegrationTab === 'email' && "Для отправки электронных писем необходимо настроить либо SendGrid API, либо SMTP сервер."}
                {activeIntegrationTab === 'active-directory' && "Настройте интеграцию с Active Directory для синхронизации пользователей и групп."}
                {activeIntegrationTab === 'api-eotinish' && "API для интеграции с eОтініш и получения обращений граждан."}
                {activeIntegrationTab === 'widget' && "Виджет для интеграции Agent Smith на веб-сайты государственных органов."}
                {activeIntegrationTab === 'html-forms' && "Настройка HTML форм для встраивания на сторонние сайты."}
              </p>
            </CardContent>
          </Card>
          
          {/* Содержимое вкладки Email настройки */}
          {activeIntegrationTab === 'email' && (
            <div className="space-y-6">
              {/* SendGrid API настройки */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">SendGrid API</CardTitle>
                  <CardDescription>
                    Настройки SendGrid API для отправки писем через их сервис
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">API Ключ SendGrid</label>
                    <input
                      type="password"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      placeholder="SG.xxxxxx"
                      value={settings?.integrations.email?.sendgrid?.apiKey || ''}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          integrations: {
                            ...settings?.integrations,
                            email: {
                              ...settings?.integrations.email,
                              sendgrid: {
                                ...settings?.integrations.email?.sendgrid,
                                apiKey: e.target.value
                              }
                            }
                          }
                        });
                      }}
                    />
                    <p className="text-xs text-muted-foreground">API ключ можно получить в панели управления SendGrid</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email отправителя по умолчанию</label>
                    <input
                      type="text"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      placeholder="Agent Smith <no-reply@agentsmith.gov.kz>"
                      value={settings?.integrations.email?.defaultSender || ''}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          integrations: {
                            ...settings?.integrations,
                            email: {
                              ...settings?.integrations.email,
                              defaultSender: e.target.value
                            }
                          }
                        });
                      }}
                    />
                  </div>
                  
                  <Button className="mt-2" variant="default" size="sm">
                    Сохранить настройки
                  </Button>
                </CardContent>
              </Card>
              
              {/* SMTP настройки */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Настройки SMTP</CardTitle>
                  <CardDescription>
                    Настройки собственного SMTP сервера для отправки писем
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">SMTP сервер</label>
                      <input
                        type="text"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        placeholder="smtp.example.com"
                        value={settings?.integrations.email?.smtp?.server || ''}
                        onChange={(e) => {
                          updateSettingsMutation.mutate({
                            integrations: {
                              ...settings?.integrations,
                              email: {
                                ...settings?.integrations.email,
                                smtp: {
                                  ...settings?.integrations.email?.smtp,
                                  server: e.target.value
                                }
                              }
                            }
                          });
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Порт</label>
                      <input
                        type="number"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        placeholder="587"
                        value={settings?.integrations.email?.smtp?.port || ''}
                        onChange={(e) => {
                          updateSettingsMutation.mutate({
                            integrations: {
                              ...settings?.integrations,
                              email: {
                                ...settings?.integrations.email,
                                smtp: {
                                  ...settings?.integrations.email?.smtp,
                                  port: parseInt(e.target.value)
                                }
                              }
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Имя пользователя</label>
                      <input
                        type="text"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        placeholder="user@example.com"
                        value={settings?.integrations.email?.smtp?.username || ''}
                        onChange={(e) => {
                          updateSettingsMutation.mutate({
                            integrations: {
                              ...settings?.integrations,
                              email: {
                                ...settings?.integrations.email,
                                smtp: {
                                  ...settings?.integrations.email?.smtp,
                                  username: e.target.value
                                }
                              }
                            }
                          });
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Пароль</label>
                      <input
                        type="password"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        placeholder="Пароль"
                        value={settings?.integrations.email?.smtp?.password || ''}
                        onChange={(e) => {
                          updateSettingsMutation.mutate({
                            integrations: {
                              ...settings?.integrations,
                              email: {
                                ...settings?.integrations.email,
                                smtp: {
                                  ...settings?.integrations.email?.smtp,
                                  password: e.target.value
                                }
                              }
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={settings?.integrations.email?.smtp?.useTLS || false}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          integrations: {
                            ...settings?.integrations,
                            email: {
                              ...settings?.integrations.email,
                              smtp: {
                                ...settings?.integrations.email?.smtp,
                                useTLS: e.target.checked
                              }
                            }
                          }
                        });
                      }}
                    />
                    <label className="text-sm">Использовать SSL/TLS</label>
                  </div>
                  
                  <Button className="mt-2" variant="default" size="sm">
                    Сохранить настройки
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Содержимое вкладки API для обращений */}
          {activeIntegrationTab === 'api-eotinish' && (
            <div className="space-y-6">
              {/* eОтініш интеграция */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">eОтініш интеграция</CardTitle>
                  <CardDescription>
                    Подключение к системе eОтініш для импорта обращений граждан
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="font-medium">Включено</div>
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={settings?.integrations.eOtinish?.enabled || false}
                        onChange={(e) => {
                          updateSettingsMutation.mutate({
                            integrations: {
                              ...settings?.integrations,
                              eOtinish: {
                                ...settings?.integrations.eOtinish,
                                enabled: e.target.checked,
                              }
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">API Endpoint</label>
                    <input
                      type="text"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      placeholder="https://eotinish.gov.kz/api/v1"
                      value={settings?.integrations.eOtinish?.apiEndpoint || ''}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          integrations: {
                            ...settings?.integrations,
                            eOtinish: {
                              ...settings?.integrations.eOtinish,
                              apiEndpoint: e.target.value,
                            }
                          }
                        });
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Токен авторизации</label>
                    <input
                      type="password"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      placeholder="Bearer token"
                      value={settings?.integrations.eOtinish?.authToken || ''}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          integrations: {
                            ...settings?.integrations,
                            eOtinish: {
                              ...settings?.integrations.eOtinish,
                              authToken: e.target.value,
                            }
                          }
                        });
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Интервал синхронизации (мин)</label>
                    <input
                      type="number"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      placeholder="30"
                      value={settings?.integrations.eOtinish?.syncInterval || '30'}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          integrations: {
                            ...settings?.integrations,
                            eOtinish: {
                              ...settings?.integrations.eOtinish,
                              syncInterval: parseInt(e.target.value),
                            }
                          }
                        });
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Как часто система будет проверять наличие новых обращений в eОтініш
                    </p>
                  </div>
                  
                  <div className="flex space-x-2 mt-4">
                    <Button className="flex-grow" variant="default" size="sm">
                      Сохранить настройки
                    </Button>
                    <Button className="flex-grow" variant="outline" size="sm">
                      Проверить соединение
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Раздел Active Directory */}
          {activeIntegrationTab === 'active-directory' && (
            <div className="mt-4 space-y-4">
              <h3 className="text-lg font-medium">Настройки Active Directory</h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label htmlFor="ad-server" className="text-sm font-medium">
                    Сервер Active Directory
                  </label>
                  <input
                    id="ad-server"
                    type="text"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    placeholder="ldap://dc.example.com"
                    value={settings?.security?.ldapSettings?.serverUrl || ''}
                    onChange={(e) => {
                      updateSettingsMutation.mutate({
                        security: {
                          ...settings?.security,
                          ldapSettings: {
                            ...settings?.security?.ldapSettings,
                            serverUrl: e.target.value,
                            baseDn: settings?.security?.ldapSettings?.baseDn || '',
                            bindDn: settings?.security?.ldapSettings?.bindDn || '',
                            bindCredentials: settings?.security?.ldapSettings?.bindCredentials || ''
                          }
                        }
                      });
                    }}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="ad-baseDn" className="text-sm font-medium">
                    Базовый DN
                  </label>
                  <input
                    id="ad-baseDn"
                    type="text"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    placeholder="DC=example,DC=com"
                    value={settings?.security?.ldapSettings?.baseDn || ''}
                    onChange={(e) => {
                      updateSettingsMutation.mutate({
                        security: {
                          ...settings?.security,
                          ldapSettings: {
                            ...settings?.security?.ldapSettings,
                            baseDn: e.target.value,
                            serverUrl: settings?.security?.ldapSettings?.serverUrl || '',
                            bindDn: settings?.security?.ldapSettings?.bindDn || '',
                            bindCredentials: settings?.security?.ldapSettings?.bindCredentials || ''
                          }
                        }
                      });
                    }}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="ad-bindDn" className="text-sm font-medium">
                    Bind DN (учетная запись для подключения)
                  </label>
                  <input
                    id="ad-bindDn"
                    type="text"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    placeholder="CN=admin,CN=Users,DC=example,DC=com"
                    value={settings?.security?.ldapSettings?.bindDn || ''}
                    onChange={(e) => {
                      updateSettingsMutation.mutate({
                        security: {
                          ...settings?.security,
                          ldapSettings: {
                            ...settings?.security?.ldapSettings,
                            bindDn: e.target.value,
                            serverUrl: settings?.security?.ldapSettings?.serverUrl || '',
                            baseDn: settings?.security?.ldapSettings?.baseDn || '',
                            bindCredentials: settings?.security?.ldapSettings?.bindCredentials || ''
                          }
                        }
                      });
                    }}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="ad-bindCredentials" className="text-sm font-medium">
                    Пароль для подключения
                  </label>
                  <input
                    id="ad-bindCredentials"
                    type="password"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    placeholder="••••••••"
                    value={settings?.security?.ldapSettings?.bindCredentials || ''}
                    onChange={(e) => {
                      updateSettingsMutation.mutate({
                        security: {
                          ...settings?.security,
                          ldapSettings: {
                            ...settings?.security?.ldapSettings,
                            bindCredentials: e.target.value,
                            serverUrl: settings?.security?.ldapSettings?.serverUrl || '',
                            baseDn: settings?.security?.ldapSettings?.baseDn || '',
                            bindDn: settings?.security?.ldapSettings?.bindDn || ''
                          }
                        }
                      });
                    }}
                  />
                </div>
                
                <div className="pt-2">
                  <Button variant="outline" className="w-full">
                    Проверить подключение к Active Directory
                  </Button>
                </div>
                
                <div className="pt-2">
                  <Button className="w-full">
                    Синхронизировать пользователей и группы
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Другие категории интеграций */}
          {activeIntegrationTab !== 'email' && activeIntegrationTab !== 'api-eotinish' && activeIntegrationTab !== 'active-directory' && (
            <div className="mt-4">
              <h3 className="text-lg font-medium">Настройки для {activeIntegrationTab}</h3>
              <p className="text-muted-foreground">
                Настройки для этой категории интеграций находятся в разработке.
              </p>
            </div>
          )}
          
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4">Внешние API интеграции</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* OpenAI API */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    OpenAI API
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${integrationStatus.openai ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {integrationStatus.openai ? 'Подключено' : 'Не подключено'}
                      <span className={`ml-1 w-2 h-2 rounded-full ${integrationStatus.openai ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Интеграция с OpenAI API для использования GPT-4 и других моделей
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="font-medium">Включено</div>
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={settings?.integrations.openai?.enabled || false}
                        onChange={(e) => {
                          updateSettingsMutation.mutate({
                            integrations: {
                              ...settings?.integrations,
                              openai: {
                                ...settings?.integrations.openai,
                                enabled: e.target.checked,
                              }
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      API ключ
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="password"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={settings?.integrations.openai?.apiKey || ''}
                        onChange={(e) => {
                          updateSettingsMutation.mutate({
                            integrations: {
                              ...settings?.integrations,
                              openai: {
                                ...settings?.integrations.openai,
                                apiKey: e.target.value,
                              }
                            }
                          });
                        }}
                      />
                      <Button 
                        variant="outline" 
                        className="whitespace-nowrap"
                        onClick={() => checkIntegrationStatus()}
                      >
                        Проверить ключ
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Модель по умолчанию
                    </label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={settings?.integrations.openai?.defaultModel || 'gpt-4o'}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          integrations: {
                            ...settings?.integrations,
                            openai: {
                              ...settings?.integrations.openai,
                              defaultModel: e.target.value,
                            }
                          }
                        });
                      }}
                    >
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
              
              {/* Anthropic Claude API */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Anthropic Claude API</CardTitle>
                  <CardDescription>
                    Интеграция с Anthropic API для использования моделей Claude
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="font-medium">Включено</div>
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={settings?.integrations.anthropic?.enabled || false}
                        onChange={(e) => {
                          updateSettingsMutation.mutate({
                            integrations: {
                              ...settings?.integrations,
                              anthropic: {
                                ...settings?.integrations.anthropic,
                                enabled: e.target.checked,
                              }
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      API ключ
                    </label>
                    <input
                      type="password"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={settings?.integrations.anthropic?.apiKey || ''}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          integrations: {
                            ...settings?.integrations,
                            anthropic: {
                              ...settings?.integrations.anthropic,
                              apiKey: e.target.value,
                            }
                          }
                        });
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Модель по умолчанию
                    </label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={settings?.integrations.anthropic?.defaultModel || 'claude-3-7-sonnet-20250219'}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          integrations: {
                            ...settings?.integrations,
                            anthropic: {
                              ...settings?.integrations.anthropic,
                              defaultModel: e.target.value,
                            }
                          }
                        });
                      }}
                    >
                      <option value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet</option>
                      <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                      <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                      <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
              
              {/* Yandex SpeechKit */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Yandex SpeechKit</CardTitle>
                  <CardDescription>
                    Интеграция с Yandex SpeechKit для распознавания и синтеза речи
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="font-medium">Включено</div>
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={settings?.integrations.yandexSpeech?.enabled || false}
                        onChange={(e) => {
                          updateSettingsMutation.mutate({
                            integrations: {
                              ...settings?.integrations,
                              yandexSpeech: {
                                ...settings?.integrations.yandexSpeech,
                                enabled: e.target.checked,
                              }
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">API ключ</label>
                    <input
                      type="password"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      value={settings?.integrations.yandexSpeech?.apiKey || ''}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          integrations: {
                            ...settings?.integrations,
                            yandexSpeech: {
                              ...settings?.integrations.yandexSpeech,
                              apiKey: e.target.value,
                            }
                          }
                        });
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Folder ID в Yandex Cloud</label>
                    <input
                      type="text"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      value={settings?.integrations.yandexSpeech?.folderId || ''}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          integrations: {
                            ...settings?.integrations,
                            yandexSpeech: {
                              ...settings?.integrations.yandexSpeech,
                              folderId: e.target.value,
                            }
                          }
                        });
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Hyperledger Besu */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Hyperledger Besu</CardTitle>
                  <CardDescription>
                    Настройка подключения к блокчейн-сети Hyperledger Besu
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="font-medium">Включено</div>
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={settings?.integrations.hyperledger?.enabled || false}
                        onChange={(e) => {
                          updateSettingsMutation.mutate({
                            integrations: {
                              ...settings?.integrations,
                              hyperledger: {
                                ...settings?.integrations.hyperledger,
                                enabled: e.target.checked,
                              }
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      URL узла
                    </label>
                    <input
                      type="text"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={settings?.integrations.hyperledger?.nodeUrl || ''}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          integrations: {
                            ...settings?.integrations,
                            hyperledger: {
                              ...settings?.integrations.hyperledger,
                              nodeUrl: e.target.value,
                            }
                          }
                        });
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Приватный ключ
                    </label>
                    <input
                      type="password"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={settings?.integrations.hyperledger?.privateKey || ''}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          integrations: {
                            ...settings?.integrations,
                            hyperledger: {
                              ...settings?.integrations.hyperledger,
                              privateKey: e.target.value,
                            }
                          }
                        });
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Компонент общих настроек
const GeneralSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ['/api/system/settings'],
  });
  
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial<SystemSettings>) => {
      return apiRequest('PATCH', '/api/system/settings', newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system/settings'] });
      toast({
        title: 'Общие настройки обновлены',
        description: 'Изменения были успешно сохранены',
      });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить общие настройки',
        variant: 'destructive',
      });
    },
  });
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>;
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Cog className="mr-2 h-5 w-5" />
            Общие настройки системы
          </CardTitle>
          <CardDescription>
            Основные параметры системы Agent Smith
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Языковые настройки */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
                  </svg>
                  Языковые настройки
                </CardTitle>
                <CardDescription>
                  Языки системы и интерфейса: русский, казахский, английский
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Язык интерфейса по умолчанию</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={settings?.general.defaultLanguage || 'ru'}
                    onChange={(e) => {
                      updateSettingsMutation.mutate({
                        general: {
                          ...settings?.general,
                          defaultLanguage: e.target.value,
                        }
                      });
                    }}
                  >
                    <option value="ru">Русский</option>
                    <option value="kk">Қазақша</option>
                    <option value="en">English</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Языки для обработки документов</label>
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="langRu"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mr-2"
                        checked={settings?.general.supportedLanguages?.includes('ru') || true}
                        onChange={(e) => {
                          let langs = settings?.general.supportedLanguages || ['ru', 'kk', 'en'];
                          if (e.target.checked) {
                            if (!langs.includes('ru')) langs.push('ru');
                          } else {
                            langs = langs.filter(l => l !== 'ru');
                          }
                          updateSettingsMutation.mutate({
                            general: {
                              ...settings?.general,
                              supportedLanguages: langs,
                            }
                          });
                        }}
                      />
                      <label htmlFor="langRu" className="text-sm">Русский</label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="langKk"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mr-2"
                        checked={settings?.general.supportedLanguages?.includes('kk') || true}
                        onChange={(e) => {
                          let langs = settings?.general.supportedLanguages || ['ru', 'kk', 'en'];
                          if (e.target.checked) {
                            if (!langs.includes('kk')) langs.push('kk');
                          } else {
                            langs = langs.filter(l => l !== 'kk');
                          }
                          updateSettingsMutation.mutate({
                            general: {
                              ...settings?.general,
                              supportedLanguages: langs,
                            }
                          });
                        }}
                      />
                      <label htmlFor="langKk" className="text-sm">Қазақша</label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="langEn"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mr-2"
                        checked={settings?.general.supportedLanguages?.includes('en') || true}
                        onChange={(e) => {
                          let langs = settings?.general.supportedLanguages || ['ru', 'kk', 'en'];
                          if (e.target.checked) {
                            if (!langs.includes('en')) langs.push('en');
                          } else {
                            langs = langs.filter(l => l !== 'en');
                          }
                          updateSettingsMutation.mutate({
                            general: {
                              ...settings?.general,
                              supportedLanguages: langs,
                            }
                          });
                        }}
                      />
                      <label htmlFor="langEn" className="text-sm">English</label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Хранилище данных */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                  </svg>
                  Хранилище данных
                </CardTitle>
                <CardDescription>
                  БД PostgreSQL, векторное хранилище Milvus/OpenSearch, хранилище файлов
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="font-medium text-sm">Тип базы данных</span>
                    <span className="text-sm">PostgreSQL</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="font-medium text-sm">Векторное хранилище</span>
                    <select
                      className="text-sm h-8 rounded-md border border-input bg-background px-2 py-1 shadow-sm"
                      value={settings?.general.vectorStore || 'milvus'}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          general: {
                            ...settings?.general,
                            vectorStore: e.target.value,
                          }
                        });
                      }}
                    >
                      <option value="milvus">Milvus</option>
                      <option value="opensearch">OpenSearch</option>
                      <option value="qdrant">QDrant</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="font-medium text-sm">Хранилище файлов</span>
                    <select
                      className="text-sm h-8 rounded-md border border-input bg-background px-2 py-1 shadow-sm"
                      value={settings?.general.fileStorage || 'local'}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          general: {
                            ...settings?.general,
                            fileStorage: e.target.value,
                          }
                        });
                      }}
                    >
                      <option value="local">Локальное</option>
                      <option value="s3">S3-совместимое</option>
                    </select>
                  </div>
                  
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Резервное копирование</div>
                    <div className="text-sm text-muted-foreground">
                      Автоматическое создание резервных копий БД
                    </div>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={settings?.general.enableBackups || false}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          general: {
                            ...settings?.general,
                            enableBackups: e.target.checked,
                          }
                        });
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Аналитика и API ключи */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Аналитика */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                  </svg>
                  Аналитика
                </CardTitle>
                <CardDescription>
                  Настройки аналитических инструментов и отчетности
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Сбор метрик использования</div>
                    <div className="text-sm text-muted-foreground">
                      Анализ функций, используемых пользователями
                    </div>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={settings?.general.analytics?.collectUsageMetrics || false}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          general: {
                            ...settings?.general,
                            analytics: {
                              ...settings?.general.analytics,
                              collectUsageMetrics: e.target.checked,
                            }
                          }
                        });
                      }}
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Журналирование действий</div>
                    <div className="text-sm text-muted-foreground">
                      Логирование активности пользователей и системы
                    </div>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={settings?.general.enableActivityLogging || false}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          general: {
                            ...settings?.general,
                            enableActivityLogging: e.target.checked,
                          }
                        });
                      }}
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Интеграция с блокчейном</div>
                    <div className="text-sm text-muted-foreground">
                      Запись критических действий в блокчейн
                    </div>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={settings?.general.enableBlockchainIntegration || false}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          general: {
                            ...settings?.general,
                            enableBlockchainIntegration: e.target.checked,
                          }
                        });
                      }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2 mt-2">
                  <label className="text-sm font-medium">Интервал автоматических отчетов</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={settings?.general.analytics?.reportInterval || 'weekly'}
                    onChange={(e) => {
                      updateSettingsMutation.mutate({
                        general: {
                          ...settings?.general,
                          analytics: {
                            ...settings?.general.analytics,
                            reportInterval: e.target.value,
                          }
                        }
                      });
                    }}
                  >
                    <option value="daily">Ежедневно</option>
                    <option value="weekly">Еженедельно</option>
                    <option value="monthly">Ежемесячно</option>
                    <option value="never">Никогда</option>
                  </select>
                </div>
              </CardContent>
            </Card>
            
            {/* API ключи */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                  </svg>
                  API ключи
                </CardTitle>
                <CardDescription>
                  Управление API ключами для внешних интеграций
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Название системы</label>
                  <input
                    type="text"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    placeholder="Agent Smith"
                    value={settings?.general.systemName || 'Agent Smith'}
                    onChange={(e) => {
                      updateSettingsMutation.mutate({
                        general: {
                          ...settings?.general,
                          systemName: e.target.value,
                        }
                      });
                    }}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Базовый URL API</label>
                  <input
                    type="text"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    placeholder="https://api.agentsmith.gov.kz"
                    value={settings?.general.apiBaseUrl || ''}
                    onChange={(e) => {
                      updateSettingsMutation.mutate({
                        general: {
                          ...settings?.general,
                          apiBaseUrl: e.target.value,
                        }
                      });
                    }}
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Публичный API</div>
                    <div className="text-sm text-muted-foreground">
                      Включить доступ к API для внешних систем
                    </div>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={settings?.general.apiEnabled || false}
                      onChange={(e) => {
                        updateSettingsMutation.mutate({
                          general: {
                            ...settings?.general,
                            apiEnabled: e.target.checked,
                          }
                        });
                      }}
                    />
                  </div>
                </div>
                
                <Button className="w-full mt-2" variant="outline">
                  Управление API ключами
                </Button>
              </CardContent>
            </Card>
          </div>
          
          {/* Информация о системе */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Информация о системе</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <dt className="font-medium">Версия:</dt>
                      <dd>1.0.0</dd>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <dt className="font-medium">Последнее обновление:</dt>
                      <dd>14 мая 2025</dd>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <dt className="font-medium">Среда выполнения:</dt>
                      <dd>Node.js v20.x</dd>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <dt className="font-medium">База данных:</dt>
                      <dd>PostgreSQL 16</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <dt className="font-medium">Блокчейн:</dt>
                      <dd>Hyperledger Besu</dd>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <dt className="font-medium">Векторное хранилище:</dt>
                      <dd>Qdrant/Milvus</dd>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <dt className="font-medium">LLM провайдеры:</dt>
                      <dd>OpenAI, Anthropic, OpenRouter, YaLM, Perplexity</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="pt-4">
            <Button>
              Сохранить настройки
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Основной компонент страницы настроек
const SystemSettings = () => {
  const [activeTab, setActiveTab] = useState<string>('general');
  
  return (
    <div className="container mx-auto py-6">
      <Breadcrumbs
        items={[
          { title: 'Главная', href: '/' },
          { title: 'Настройки системы', href: '/system-settings' }
        ]}
      />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center">
          <Cog className="mr-2 h-6 w-6" />
          Настройки системы
        </h1>
      </div>
      
      <Tabs defaultValue="general" className="w-full" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-8 bg-muted/20 p-1">
          <TabsTrigger value="general" className="rounded-md">Общие</TabsTrigger>
          <TabsTrigger value="integrations" className="rounded-md">Интеграции</TabsTrigger>
          <TabsTrigger value="security" className="rounded-md">Безопасность</TabsTrigger>
          <TabsTrigger value="users" className="rounded-md">Пользователи</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>
        
        <TabsContent value="integrations">
          <IntegrationsSettings />
        </TabsContent>
        
        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>
        
        <TabsContent value="users">
          <div className="mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl flex items-center">
                  <UsersIcon className="mr-2 h-5 w-5" />
                  Управление пользователями
                </CardTitle>
                <CardDescription>
                  Создание, редактирование и управление пользователями системы
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
          <Users />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemSettings;