import { 
  User, InsertUser, 
  Task, InsertTask, 
  Document, InsertDocument,
  BlockchainRecord, InsertBlockchainRecord,
  Message, InsertMessage,
  Activity, InsertActivity,
  SystemStatusItem, InsertSystemStatusItem,
  Integration, InsertIntegration,
  Agent, InsertAgent,
  CitizenRequest, InsertCitizenRequest
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Task operations
  getTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  getTasksByUser(userId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  
  // Document operations
  getDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByTask(taskId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined>;
  
  // Blockchain record operations
  getBlockchainRecords(): Promise<BlockchainRecord[]>;
  getBlockchainRecord(id: number): Promise<BlockchainRecord | undefined>;
  getRecentBlockchainRecords(limit: number): Promise<BlockchainRecord[]>;
  createBlockchainRecord(record: InsertBlockchainRecord): Promise<BlockchainRecord>;
  updateBlockchainRecord(id: number, record: Partial<InsertBlockchainRecord>): Promise<BlockchainRecord | undefined>;
  
  // Message operations
  getMessages(): Promise<Message[]>;
  getMessagesByTask(taskId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Activity operations
  getActivities(): Promise<Activity[]>;
  getRecentActivities(limit: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // System status operations
  getSystemStatuses(): Promise<SystemStatusItem[]>;
  updateSystemStatus(serviceName: string, status: InsertSystemStatusItem): Promise<SystemStatusItem | undefined>;
  
  // Integration operations
  getIntegrations(): Promise<Integration[]>;
  getIntegration(id: number): Promise<Integration | undefined>;
  getIntegrationsByType(type: string): Promise<Integration[]>;
  createIntegration(integration: InsertIntegration): Promise<Integration>;
  updateIntegration(id: number, integration: Partial<InsertIntegration>): Promise<Integration | undefined>;
  deleteIntegration(id: number): Promise<boolean>;
  
  // Agent operations
  getAgents(): Promise<Agent[]>;
  getAgent(id: number): Promise<Agent | undefined>;
  getAgentsByType(type: string): Promise<Agent[]>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined>;
  deleteAgent(id: number): Promise<boolean>;
  
  // Citizen Request operations
  getCitizenRequests(): Promise<CitizenRequest[]>;
  getCitizenRequest(id: number): Promise<CitizenRequest | undefined>;
  createCitizenRequest(request: InsertCitizenRequest): Promise<CitizenRequest>;
  updateCitizenRequest(id: number, request: Partial<InsertCitizenRequest>): Promise<CitizenRequest | undefined>;
  processCitizenRequestWithAI(id: number): Promise<CitizenRequest | undefined>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tasks: Map<number, Task>;
  private documents: Map<number, Document>;
  private blockchainRecords: Map<number, BlockchainRecord>;
  private messages: Map<number, Message>;
  private activities: Map<number, Activity>;
  private systemStatuses: Map<string, SystemStatusItem>;
  private integrations: Map<number, Integration>;
  private agents: Map<number, Agent>;
  private citizenRequests: Map<number, CitizenRequest>;
  
  private userIdCounter: number;
  private taskIdCounter: number;
  private documentIdCounter: number;
  private blockchainRecordIdCounter: number;
  private messageIdCounter: number;
  private activityIdCounter: number;
  private systemStatusIdCounter: number;
  private integrationIdCounter: number;
  private agentIdCounter: number;

  private citizenRequestIdCounter: number;
  
  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.documents = new Map();
    this.blockchainRecords = new Map();
    this.messages = new Map();
    this.activities = new Map();
    this.systemStatuses = new Map();
    this.integrations = new Map();
    this.agents = new Map();
    this.citizenRequests = new Map();
    
    this.userIdCounter = 1;
    this.taskIdCounter = 1;
    this.documentIdCounter = 1;
    this.blockchainRecordIdCounter = 1;
    this.messageIdCounter = 1;
    this.activityIdCounter = 1;
    this.systemStatusIdCounter = 1;
    this.integrationIdCounter = 1;
    this.agentIdCounter = 1;
    this.citizenRequestIdCounter = 1;
    
    // Initialize with some default data
    this.initializeDefaultData();
  }

  // Initialize with default data
  private initializeDefaultData() {
    // Create default users
    const defaultUser: InsertUser = {
      username: "admin",
      password: "admin123",
      fullName: "Айнур Бекова",
      department: "Департамент цифровизации",
      role: "admin",
      email: "ainur@gov.kz"
    };
    
    const defaultUser2: InsertUser = {
      username: "operator",
      password: "operator123",
      fullName: "Ержан Тулегенов",
      department: "Обслуживание населения",
      role: "operator",
      email: "erzhan@gov.kz"
    };
    
    const defaultUser3: InsertUser = {
      username: "manager",
      password: "manager123",
      fullName: "Динара Нуржанова",
      department: "Управление проектами",
      role: "manager",
      email: "dinara@gov.kz"
    };
    
    // Создаем пользователей и дальше инициализируем данные
    this.createUser(defaultUser).then(admin => {
      this.createUser(defaultUser2).then(operator => {
        this.createUser(defaultUser3).then(manager => {
          
          // Initialize system statuses
          const statuses: InsertSystemStatusItem[] = [
            { serviceName: "Agent Smith Core", status: 100, details: "Система работает нормально" },
            { serviceName: "Blockchain Node", status: 100, details: "Система работает нормально" },
            { serviceName: "Speech-to-Text", status: 92, details: "Некоторые задержки при обработке длинных записей" },
            { serviceName: "Document Processing", status: 98, details: "Система работает нормально" }
          ];
          
          statuses.forEach(status => {
            this.updateSystemStatus(status.serviceName, status);
          });

          // Initialize default integrations
          const defaultIntegrations: InsertIntegration[] = [
            {
              name: "OpenAI GPT-4o",
              type: "openai",
              apiUrl: "https://api.openai.com/v1",
              apiKey: process.env.OPENAI_API_KEY || "",
              isActive: true,
              config: {}
            },
            {
              name: "Yandex Speech Kit",
              type: "speech",
              apiUrl: "https://stt.api.cloud.yandex.net/speech/v1/stt:recognize",
              apiKey: "",
              isActive: true,
              config: { 
                languageCodes: ["ru-RU", "kk-KZ", "en-US"] 
              }
            },
            {
              name: "Documentolog",
              type: "documentolog",
              apiUrl: "https://documentolog.kz/api/v2",
              apiKey: "",
              isActive: true,
              config: {}
            },
            {
              name: "OpenProject",
              type: "openproject",
              apiUrl: "https://openproject.gov.kz/api/v3",
              apiKey: "",
              isActive: false,
              config: {}
            },
            {
              name: "Hyperledger Besu",
              type: "blockchain",
              apiUrl: "https://besu.gov.kz/api",
              apiKey: "",
              isActive: true,
              config: {
                chainId: "123456",
                networkName: "GovChain"
              }
            },
            {
              name: "Milvus Vector DB",
              type: "vectordb",
              apiUrl: "http://milvus-server:19530",
              apiKey: "",
              isActive: true,
              config: {
                collectionName: "gov_documents",
                dimensions: 1536,
                indexType: "IVF_FLAT",
                metricType: "L2"
              }
            },
            {
              name: "Anthropic Claude",
              type: "anthropic",
              apiUrl: "https://api.anthropic.com/v1",
              apiKey: process.env.ANTHROPIC_API_KEY || "",
              isActive: false,
              config: {
                defaultModel: "claude-3-7-sonnet-20250219"
              }
            }
          ];
          
          Promise.all(defaultIntegrations.map(integration => 
            this.createIntegration(integration)
          )).then(integrations => {
            // Initialize default agents
            const openaiIntegration = integrations.find(i => i.type === 'openai');
            const defaultIntegrationId = openaiIntegration ? openaiIntegration.id : 1;
            
            const defaultAgents: InsertAgent[] = [
              // Кросс-институциональные агенты
              {
                name: "AgentSmith",
                type: "citizen_requests",
                description: "Обрабатывает и категоризирует запросы от граждан, помогает составить ответы",
                modelId: defaultIntegrationId,
                isActive: true,
                systemPrompt: "Вы - специалист по работе с обращениями граждан. Ваша задача - классифицировать, определять приоритеты и маршрутизировать запросы граждан, а также помогать составлять профессиональные и информативные ответы.",
                config: {
                  temperature: 0.2,
                  maxTokens: 2048
                },
                stats: {
                  processedRequests: 1287,
                  avgResponseTime: 4.3,
                  accuracyRate: 0.94,
                  timeReduction: "68%"
                }
              },
              {
                name: "DocumentAI",
                type: "document_processing",
                description: "Анализирует и структурирует документы",
                modelId: defaultIntegrationId,
                isActive: true,
                systemPrompt: "Вы - эксперт по анализу и обработке документов. Ваша задача - анализировать структуру и юридическую корректность документов, извлекать важную информацию и готовить краткие резюме.",
                config: {
                  temperature: 0.1,
                  maxTokens: 4096
                },
                stats: {
                  processedDocuments: 3462,
                  avgAnalysisTime: 8.2,
                  accuracyRate: 0.96,
                  timeReduction: "73%"
                }
              },
              {
                name: "BlockchainValidator",
                type: "blockchain",
                description: "Прозрачная регистрация событий в блокчейне",
                modelId: defaultIntegrationId,
                isActive: true,
                systemPrompt: "Вы - эксперт по работе с блокчейн-системами. Ваша задача - хешировать и записывать действия в блокчейн, обеспечивая прозрачность и неизменность данных.",
                config: {
                  chainId: "123456",
                  networkName: "GovChain"
                },
                stats: {
                  processedTransactions: 25892,
                  avgProcessingTime: 1.8,
                  successRate: 0.99,
                  timeReduction: "65%"
                }
              },
              {
                name: "ProtocolMaster",
                type: "meeting_protocols",
                description: "Анализирует записи и протоколы совещаний, расшифровывает и извлекает решения",
                modelId: defaultIntegrationId,
                isActive: true,
                systemPrompt: "Вы - эксперт по анализу записей совещаний и создания протоколов. Ваша задача - расшифровывать и анализировать записи совещаний, выделять ключевую информацию, формировать списки задач и решений, а также создавать краткие и информативные протоколы.",
                config: {
                  temperature: 0.1,
                  maxTokens: 4096
                },
                stats: {
                  processedMeetings: 586,
                  avgTranscriptionTime: 15.4,
                  accuracyRate: 0.93,
                  timeReduction: "79%"
                }
              },
              {
                name: "TranslatorAI",
                type: "translator",
                description: "Переводит голос и текст в реальном времени (KK/RU/EN)",
                modelId: defaultIntegrationId,
                isActive: true,
                systemPrompt: "Вы - профессиональный переводчик с глубоким знанием казахского, русского и английского языков, а также юридической и государственной терминологии. Ваша задача - обеспечивать точный и контекстуально правильный перевод официальных документов и речи между этими языками в реальном времени.",
                config: {
                  temperature: 0.3,
                  maxTokens: 8192,
                  languageCodes: ["ru-RU", "kk-KZ", "en-US"]
                },
                stats: {
                  translatedPages: 12458,
                  avgTranslationTime: 2.3,
                  accuracyRate: 0.95,
                  timeReduction: "82%"
                }
              },
              {
                name: "RAGAgent",
                type: "knowledge_base",
                description: "Интеллектуальный помощник с доступом к базам знаний через RAG",
                modelId: defaultIntegrationId,
                isActive: true,
                systemPrompt: "Вы - интеллектуальный помощник с доступом к базам знаний через систему Retrieval Augmented Generation. Ваша задача - отвечать на вопросы, используя актуальную информацию из баз знаний, документов и справочников, с указанием источников.",
                config: {
                  temperature: 0.2,
                  maxTokens: 4096,
                  vectorDbIntegrationId: integrations.find(i => i.type === 'vectordb')?.id || 1,
                  retrievalStrategy: "hybrid",
                  retrievalTopK: 5
                },
                stats: {
                  processedQueries: 7856,
                  avgResponseTime: 3.2,
                  userSatisfaction: 0.97,
                  timeReduction: "85%"
                }
              },
              {
                name: "AppealTracker",
                type: "citizen_requests",
                description: "Отслеживание жалоб и уведомления",
                modelId: defaultIntegrationId,
                isActive: true,
                systemPrompt: "Вы - специалист по отслеживанию и эскалации нерешенных жалоб граждан. Ваша задача - мониторить статусы обращений, отправлять уведомления о просроченных обращениях и эскалировать нерешенные жалобы на соответствующий уровень.",
                config: {
                  temperature: 0.2,
                  maxTokens: 2048
                },
                stats: {
                  trackedAppeals: 5234,
                  avgResolutionTime: 12.8,
                  escalationRate: 0.14,
                  timeReduction: "62%"
                }
              },
              // Профильные агенты по министерствам
              {
                name: "ЛегалАдвайзер",
                type: "legal",
                description: "Проверка НПА и юридическая техника",
                ministryId: 1, // Минюст
                modelId: defaultIntegrationId,
                isActive: true,
                systemPrompt: "Вы - юридический эксперт Министерства юстиции. Ваша задача - проверять нормативно-правовые акты на соответствие законодательству, оценивать юридическую технику и давать рекомендации по улучшению документов.",
                config: {
                  temperature: 0.1,
                  maxTokens: 4096
                },
                stats: {
                  processedDocuments: 1248,
                  avgAnalysisTime: 10.5,
                  complianceScore: 0.97,
                  timeReduction: "71%"
                }
              },
              {
                name: "ЕНТКонсультант",
                type: "education",
                description: "Помощник по ЕНТ и поступлению",
                ministryId: 2, // МОН
                modelId: defaultIntegrationId,
                isActive: true,
                systemPrompt: "Вы - консультант по Единому национальному тестированию и поступлению в вузы Казахстана. Ваша задача - отвечать на вопросы абитуриентов о процедуре ЕНТ, грантах, заявлениях и поступлении в учебные заведения.",
                config: {
                  temperature: 0.3,
                  maxTokens: 2048
                },
                stats: {
                  answeredQuestions: 8795,
                  avgResponseTime: 1.8,
                  userSatisfaction: 0.96,
                  timeReduction: "89%"
                }
              },
              {
                name: "КазГрамматика",
                type: "education",
                description: "Проверка текста на казахском языке",
                ministryId: 2, // МОН
                modelId: defaultIntegrationId,
                isActive: true,
                systemPrompt: "Вы - эксперт по казахскому языку и грамматике. Ваша задача - проверять и исправлять грамматические, стилистические и пунктуационные ошибки в текстах на казахском языке, а также давать рекомендации по улучшению стиля.",
                config: {
                  temperature: 0.2,
                  maxTokens: 3072
                },
                stats: {
                  processedTexts: 4562,
                  avgCheckTime: 3.2,
                  accuracyRate: 0.98,
                  timeReduction: "76%"
                }
              },
              {
                name: "МедЭксперт",
                type: "healthcare",
                description: "Помощь врачу в анализе симптомов",
                ministryId: 3, // МЗ
                modelId: defaultIntegrationId,
                isActive: true,
                systemPrompt: "Вы - медицинский консультант для врачей. Ваша задача - помогать в анализе симптомов, предлагать возможные диагнозы на основе симптомов и медицинской истории, а также рекомендовать дополнительные исследования для подтверждения диагноза.",
                config: {
                  temperature: 0.1,
                  maxTokens: 4096
                },
                stats: {
                  processedCases: 2735,
                  avgAnalysisTime: 5.6,
                  accuracyRate: 0.92,
                  timeReduction: "67%"
                }
              },
              {
                name: "НефтеТрекер",
                type: "energy",
                description: "Контроль поставок нефти",
                ministryId: 4, // Минэнерго
                modelId: defaultIntegrationId,
                isActive: true,
                systemPrompt: "Вы - аналитик по нефтяным поставкам Министерства энергетики. Ваша задача - оптимизировать планы распределения нефти, отслеживать поставки, анализировать отклонения от плана и предлагать решения по оптимизации логистики.",
                config: {
                  temperature: 0.2,
                  maxTokens: 2048
                },
                stats: {
                  monitoredDeliveries: 1892,
                  avgProcessingTime: 8.4,
                  optimizationRate: 0.18,
                  timeReduction: "54%"
                }
              },
              {
                name: "СтройАналитик",
                type: "construction",
                description: "Проверка градостроительных документов",
                ministryId: 5, // Минстрой
                modelId: defaultIntegrationId,
                isActive: true,
                systemPrompt: "Вы - эксперт по градостроительным документам и геоинформационным системам. Ваша задача - сравнивать слои ГИС для городских проектов, проверять соответствие градостроительных документов нормативам и выявлять возможные проблемы.",
                config: {
                  temperature: 0.1,
                  maxTokens: 3072
                },
                stats: {
                  analyzedProjects: 845,
                  avgAnalysisTime: 12.7,
                  issueDetectionRate: 0.22,
                  timeReduction: "63%"
                }
              },
              {
                name: "ПотребЗащита",
                type: "trade",
                description: "Помощь гражданам в защите прав потребителей",
                ministryId: 6, // Минторг
                modelId: defaultIntegrationId,
                isActive: true,
                systemPrompt: "Вы - консультант по защите прав потребителей. Ваша задача - помогать гражданам в составлении жалоб на нарушение прав потребителей, разъяснять их права и обязанности продавцов/поставщиков услуг, а также рекомендовать дальнейшие действия.",
                config: {
                  temperature: 0.3,
                  maxTokens: 2048
                },
                stats: {
                  assistedComplaints: 3872,
                  avgResponseTime: 3.9,
                  resolutionRate: 0.76,
                  timeReduction: "81%"
                }
              },
              {
                name: "АгроСубсидия",
                type: "agriculture",
                description: "Автоматизация субсидий для фермеров",
                ministryId: 7, // Минсельхоз
                modelId: defaultIntegrationId,
                isActive: true,
                systemPrompt: "Вы - специалист по сельскохозяйственным субсидиям. Ваша задача - автоматически заполнять заявки на субсидии на основе данных фермеров, проверять корректность информации и рекомендовать оптимальные программы субсидирования.",
                config: {
                  temperature: 0.2,
                  maxTokens: 2048
                },
                stats: {
                  processedApplications: 2156,
                  avgProcessingTime: 7.3,
                  approvalRate: 0.88,
                  timeReduction: "78%"
                }
              },
              {
                name: "ДипломатАссистент",
                type: "foreign_affairs",
                description: "Подготовка брифингов и справок",
                ministryId: 8, // МИД
                modelId: defaultIntegrationId,
                isActive: true,
                systemPrompt: "Вы - аналитик Министерства иностранных дел. Ваша задача - составлять краткие аналитические брифинги по международной политике для министра, обобщать ключевые события и их потенциальное влияние на внешнюю политику Казахстана.",
                config: {
                  temperature: 0.2,
                  maxTokens: 4096
                },
                stats: {
                  preparedBriefings: 834,
                  avgPreparationTime: 14.7,
                  qualityScore: 0.96,
                  timeReduction: "72%"
                }
              },
              {
                name: "ТрудАналитик",
                type: "labor",
                description: "Прогноз кадров на основе проектов",
                ministryId: 9, // Минтруда
                modelId: defaultIntegrationId,
                isActive: true,
                systemPrompt: "Вы - специалист по прогнозированию потребностей в кадрах. Ваша задача - анализировать данные о планируемых государственных и частных проектах для прогнозирования потребностей в различных специалистах по секторам экономики.",
                config: {
                  temperature: 0.2,
                  maxTokens: 2048
                },
                stats: {
                  generatedForecasts: 567,
                  avgProcessingTime: 18.5,
                  accuracyRate: 0.85,
                  timeReduction: "68%"
                }
              },
              {
                name: "ТранспортАналитик",
                type: "transport",
                description: "Консультант по логистике и госуслугам",
                ministryId: 10, // Минтранс
                modelId: defaultIntegrationId,
                isActive: true,
                systemPrompt: "Вы - консультант по транспорту и логистике. Ваша задача - консультировать пользователей по вопросам транспорта, логистики и связанных государственных услуг, помогать оптимизировать маршруты и выбирать оптимальные транспортные решения.",
                config: {
                  temperature: 0.3,
                  maxTokens: 2048
                },
                stats: {
                  answeredQueries: 3245,
                  avgResponseTime: 4.2,
                  optimizationRate: 0.34,
                  timeReduction: "59%"
                }
              },
              {
                name: "ДорожныйИнспектор",
                type: "internal_affairs",
                description: "Определение нарушителей ПДД",
                ministryId: 11, // МВД
                modelId: defaultIntegrationId,
                isActive: true,
                systemPrompt: "Вы - аналитик дорожной безопасности. Ваша задача - анализировать видеоматериалы для выявления нарушений правил дорожного движения, классифицировать тип нарушения и готовить данные для последующей обработки.",
                config: {
                  temperature: 0.1,
                  maxTokens: 2048
                },
                stats: {
                  analyzedFootage: 10876,
                  avgAnalysisTime: 5.8,
                  detectionRate: 0.93,
                  timeReduction: "87%"
                }
              }
            ];
            
            Promise.all(defaultAgents.map(agent => this.createAgent(agent))).then(() => {
              // Создаем тестовые задачи
              const testTasks: InsertTask[] = [
                {
                  title: "Разработка интерфейса Agent Smith",
                  description: "Разработать пользовательский интерфейс для системы Agent Smith с учетом требований государственных органов. Интерфейс должен быть понятным, удобным и соответствовать стандартам электронного правительства.",
                  status: "completed",
                  priority: "high",
                  createdBy: admin.id,
                  assignedTo: admin.id,
                  dueDate: new Date(2025, 3, 30)
                },
                {
                  title: "Интеграция с Documentolog",
                  description: "Реализовать двустороннюю интеграцию с системой Documentolog для обеспечения автоматического обмена документами. Требуется разработать API для обмена данными и обеспечить защищенное соединение между системами.",
                  status: "in_progress",
                  priority: "high",
                  createdBy: admin.id,
                  assignedTo: operator.id,
                  dueDate: new Date(2025, 4, 15)
                },
                {
                  title: "Тестирование блокчейн-интеграции",
                  description: "Провести тестирование интеграции с Hyperledger Besu и проверить корректность записи всех системных действий в блокчейн. Необходимо протестировать все основные сценарии использования системы и убедиться, что информация корректно записывается и может быть проверена.",
                  status: "pending",
                  priority: "medium",
                  createdBy: manager.id,
                  assignedTo: admin.id,
                  dueDate: new Date(2025, 4, 20)
                },
                {
                  title: "Обучение AI на данных госорганов",
                  description: "Провести тонкую настройку AI-моделей с использованием данных государственных услуг для улучшения качества обработки запросов и документов. Модели должны быть адаптированы к специфике государственной документации и запросов граждан.",
                  status: "new",
                  priority: "medium",
                  createdBy: manager.id,
                  assignedTo: operator.id,
                  dueDate: new Date(2025, 5, 10)
                }
              ];
              
              // Последовательно создаем задачи и связанные сущности
              Promise.all(testTasks.map(task => this.createTask(task))).then(createdTasks => {
                // Создаем тестовую активность для задач
                createdTasks.forEach((task, index) => {
                  // Логируем создание задачи в активности
                  this.createActivity({
                    userId: task.createdBy,
                    actionType: 'task_created',
                    description: `Создана задача "${task.title}"`,
                    relatedId: task.id,
                    relatedType: 'task',
                    entityType: 'task',
                    entityId: task.id,
                    action: 'create'
                  });
                  
                  // Для первой задачи добавляем историю изменения статусов
                  if (index === 0) {
                    const statusHistory = ['new', 'in_progress', 'review', 'completed'];
                    const today = new Date();
                    
                    statusHistory.forEach((status, statusIndex) => {
                      const statusDate = new Date(today);
                      statusDate.setDate(today.getDate() - (statusHistory.length - statusIndex) * 3);
                      
                      this.createActivity({
                        userId: admin.id,
                        actionType: 'task_status_changed',
                        description: `Статус задачи "${task.title}" изменен на "${status}"`,
                        relatedId: task.id,
                        relatedType: 'task',
                        entityType: 'task',
                        entityId: task.id,
                        action: 'update',
                        metadata: {
                          oldStatus: statusIndex > 0 ? statusHistory[statusIndex - 1] : 'new',
                          newStatus: status,
                          changeDate: statusDate
                        }
                      });
                    });
                    
                    // Создаем блокчейн-запись для финального статуса
                    this.createBlockchainRecord({
                      recordType: 'task_completed',
                      title: `Завершение задачи ${task.title}`,
                      taskId: task.id,
                      entityType: 'task',
                      entityId: task.id,
                      transactionHash: '0x7f8b8d8f0e9c7b6a5d4c3b2a1098f7e6d5c4b3a2d1e0f9c8b7a6d5e4f3c2b1a0',
                      status: 'confirmed',
                      metadata: {
                        action: 'status_update',
                        newStatus: 'completed',
                        completedBy: admin.id,
                        summary: 'Задача успешно выполнена, интерфейс разработан согласно требованиям'
                      }
                    });
                  }
                  
                  // Для второй задачи создаем блокчейн-запись об обновлении статуса
                  if (index === 1) {
                    this.createBlockchainRecord({
                      recordType: 'task_update',
                      title: `Обновление задачи ${task.title}`,
                      taskId: task.id,
                      entityType: 'task',
                      entityId: task.id,
                      transactionHash: '0x8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
                      status: 'confirmed',
                      metadata: {
                        action: 'status_update',
                        oldStatus: 'new',
                        newStatus: 'in_progress',
                        updatedBy: operator.id,
                        updateDate: new Date(),
                        comment: 'Работа над интеграцией началась, ожидается доступ к API Documentolog'
                      }
                    });
                    
                    // Добавляем активность изменения статуса
                    this.createActivity({
                      userId: operator.id,
                      actionType: 'task_status_changed',
                      description: `Статус задачи "${task.title}" изменен на "in_progress"`,
                      relatedId: task.id,
                      relatedType: 'task',
                      entityType: 'task',
                      entityId: task.id,
                      action: 'update',
                      metadata: {
                        oldStatus: 'new',
                        newStatus: 'in_progress',
                        comment: 'Работа над интеграцией началась, ожидается доступ к API Documentolog'
                      }
                    });
                  }
                  
                  // Для третьей задачи создаем сообщения в чате
                  if (index === 2) {
                    const chatMessages = [
                      {
                        role: 'user',
                        content: 'Когда планируется начать тестирование?',
                        userId: manager.id,
                        taskId: task.id
                      },
                      {
                        role: 'user',
                        content: 'Планирую начать на следующей неделе, после настройки тестовой среды',
                        userId: admin.id,
                        taskId: task.id
                      },
                      {
                        role: 'user',
                        content: 'Какие сценарии будут тестироваться в первую очередь?',
                        userId: manager.id,
                        taskId: task.id
                      },
                      {
                        role: 'user',
                        content: 'Начнем с базовых операций: создание, обновление и проверка записей в блокчейне',
                        userId: admin.id,
                        taskId: task.id
                      }
                    ];
                    
                    // Последовательно создаем сообщения
                    Promise.all(chatMessages.map(msg => this.createMessage(msg)));
                  }
                });
                
                // Создаем тестовые обращения граждан
                const testRequests: InsertCitizenRequest[] = [
                  {
                    fullName: 'Ахметов Ринат',
                    contactInfo: 'ahmetov@mail.kz',
                    requestType: 'complaint',
                    subject: 'Проблема с получением электронной подписи',
                    description: 'При получении ЭЦП в ЦОНе возникла проблема с верификацией личности. Сотрудники отказались принимать документы, ссылаясь на проблемы в системе.',
                    status: 'processing',
                    priority: 'high',
                    assignedTo: operator.id,
                    citizenInfo: {
                      iin: '880101300123',
                      address: 'г. Астана, ул. Абая, 15, кв. 89',
                      phoneNumber: '+7 701 123 45 67'
                    },
                    summary: 'Проблемы с получением ЭЦП в ЦОНе из-за технических неполадок в системе верификации.'
                  },
                  {
                    fullName: 'Карпова Светлана',
                    contactInfo: 'karpova@mail.kz',
                    requestType: 'inquiry',
                    subject: 'Запрос о сроках рассмотрения заявления',
                    description: 'Подала заявление на получение социальной помощи 10 дней назад. Хотела бы узнать, когда ожидать ответа и какие сроки установлены законодательством.',
                    status: 'new',
                    priority: 'medium',
                    citizenInfo: {
                      iin: '900202400456',
                      address: 'г. Алматы, пр. Достык, 65, кв. 12',
                      phoneNumber: '+7 702 234 56 78'
                    },
                    summary: 'Запрос информации о сроках рассмотрения заявления на получение социальной помощи.'
                  },
                  {
                    fullName: 'Тургунбаев Аскар',
                    contactInfo: 'askar@gmail.com',
                    requestType: 'suggestion',
                    subject: 'Предложение по улучшению работы портала электронного правительства',
                    description: 'Предлагаю добавить функционал автоматического заполнения форм на основе данных из базы ИИН. Это значительно ускорит процесс заполнения заявлений и сократит количество ошибок.',
                    status: 'new',
                    priority: 'low',
                    citizenInfo: {
                      iin: '850505300789',
                      address: 'г. Шымкент, ул. Тауке хана, 45, кв. 12',
                      phoneNumber: '+7 705 345 67 89'
                    },
                    summary: 'Предложение по автоматизации заполнения форм на портале электронного правительства.'
                  }
                ];
                
                Promise.all(testRequests.map(request => this.createCitizenRequest(request)))
                  .then(createdRequests => {
                    // Создаем блокчейн-запись для первого обращения
                    this.createBlockchainRecord({
                      recordType: 'citizen_request',
                      title: `Обращение гражданина: ${createdRequests[0].subject}`,
                      entityType: 'citizen_request',
                      entityId: createdRequests[0].id,
                      transactionHash: '0xe9c7b6a5d4c3b2a1098f7e6d5c4b3a2d1e0f9c8b7a6d5e4f3c2b1a0f9e8d7c6',
                      status: 'confirmed',
                      metadata: {
                        requestType: createdRequests[0].requestType,
                        createdAt: createdRequests[0].createdAt,
                        priority: createdRequests[0].priority
                      }
                    });
                    
                    // Добавляем активность для обращений
                    createdRequests.forEach(request => {
                      this.createActivity({
                        actionType: 'citizen_request_created',
                        description: `Поступило обращение от ${request.fullName}: ${request.subject}`,
                        relatedId: request.id,
                        relatedType: 'citizen_request',
                        entityType: 'citizen_request',
                        entityId: request.id,
                        action: 'create',
                        metadata: {
                          requestType: request.requestType,
                          priority: request.priority
                        }
                      });
                      
                      // Для первого обращения добавляем историю обработки
                      if (request.id === createdRequests[0].id) {
                        this.createActivity({
                          userId: operator.id,
                          actionType: 'citizen_request_status_changed',
                          description: `Статус обращения изменен на "processing"`,
                          relatedId: request.id,
                          relatedType: 'citizen_request',
                          entityType: 'citizen_request',
                          entityId: request.id,
                          action: 'update',
                          metadata: {
                            oldStatus: 'new',
                            newStatus: 'processing',
                            comment: 'Начата обработка обращения, направлен запрос в ЦОН'
                          }
                        });
                      }
                    });
                    
                    // Создаем тестовые документы
                    const testDocuments: InsertDocument[] = [
                      {
                        title: 'Техническое задание - Интеграция с Documentolog',
                        description: 'Документ с описанием требований к интеграции с системой электронного документооборота',
                        fileType: 'application/pdf',
                        fileUrl: '/documents/tech_spec_documentolog.pdf',
                        taskId: createdTasks[1].id,
                        uploadedBy: admin.id,
                        processed: true,
                        summary: 'Техническое задание содержит требования к API интеграции, форматы обмена данными и требования к безопасности'
                      },
                      {
                        title: 'Протокол совещания по блокчейн-интеграции',
                        description: 'Протокол обсуждения вопросов интеграции с Hyperledger Besu',
                        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        fileUrl: '/documents/meeting_protocol_blockchain.docx',
                        taskId: createdTasks[2].id,
                        uploadedBy: manager.id,
                        processed: true,
                        summary: 'Протокол содержит описание требований к тестированию, сроки и ответственных лиц'
                      }
                    ];
                    
                    Promise.all(testDocuments.map(doc => this.createDocument(doc)))
                      .then(createdDocs => {
                        // Создаем блокчейн-запись для первого документа
                        this.createBlockchainRecord({
                          recordType: 'document_upload',
                          title: `Загрузка документа: ${createdDocs[0].title}`,
                          entityType: 'document',
                          entityId: createdDocs[0].id,
                          documentId: createdDocs[0].id,
                          taskId: createdDocs[0].taskId,
                          transactionHash: '0xd8c7b6a5e4f3c2d1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7',
                          status: 'confirmed',
                          metadata: {
                            documentType: createdDocs[0].fileType,
                            uploadedBy: createdDocs[0].uploadedBy,
                            uploadedAt: createdDocs[0].createdAt
                          }
                        });
                        
                        // Добавляем активность для документов
                        createdDocs.forEach(doc => {
                          this.createActivity({
                            userId: doc.uploadedBy,
                            actionType: 'document_uploaded',
                            description: `Загружен документ "${doc.title}"`,
                            relatedId: doc.id,
                            relatedType: 'document',
                            entityType: 'document',
                            entityId: doc.id,
                            action: 'create'
                          });
                          
                          if (doc.processed) {
                            this.createActivity({
                              userId: admin.id,
                              actionType: 'document_processed',
                              description: `Документ "${doc.title}" обработан AI`,
                              relatedId: doc.id,
                              relatedType: 'document',
                              entityType: 'document',
                              entityId: doc.id,
                              action: 'update',
                              metadata: {
                                summary: doc.summary
                              }
                            });
                          }
                        });
                      });
                  });
              });
            });
          });
        });
      });
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Task methods
  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasksByUser(userId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.assignedTo === userId || task.createdBy === userId
    );
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.taskIdCounter++;
    const task: Task = { 
      ...insertTask, 
      id, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: number, updateData: Partial<InsertTask>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask: Task = {
      ...task,
      ...updateData,
      updatedAt: new Date()
    };
    
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  // Document methods
  async getDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocumentsByTask(taskId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (document) => document.taskId === taskId
    );
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentIdCounter++;
    const document: Document = { 
      ...insertDocument, 
      id, 
      createdAt: new Date() 
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: number, updateData: Partial<InsertDocument>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    const updatedDocument: Document = {
      ...document,
      ...updateData
    };
    
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  // Blockchain record methods
  async getBlockchainRecords(): Promise<BlockchainRecord[]> {
    return Array.from(this.blockchainRecords.values());
  }

  async getBlockchainRecord(id: number): Promise<BlockchainRecord | undefined> {
    return this.blockchainRecords.get(id);
  }

  async getRecentBlockchainRecords(limit: number): Promise<BlockchainRecord[]> {
    return Array.from(this.blockchainRecords.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createBlockchainRecord(insertRecord: InsertBlockchainRecord): Promise<BlockchainRecord> {
    const id = this.blockchainRecordIdCounter++;
    const record: BlockchainRecord = {
      ...insertRecord,
      id,
      createdAt: new Date(),
      confirmedAt: insertRecord.status === "confirmed" ? new Date() : null
    };
    this.blockchainRecords.set(id, record);
    return record;
  }

  async updateBlockchainRecord(id: number, updateData: Partial<InsertBlockchainRecord>): Promise<BlockchainRecord | undefined> {
    const record = this.blockchainRecords.get(id);
    if (!record) return undefined;
    
    const updatedRecord: BlockchainRecord = {
      ...record,
      ...updateData,
      confirmedAt: updateData.status === "confirmed" ? new Date() : record.confirmedAt
    };
    
    this.blockchainRecords.set(id, updatedRecord);
    return updatedRecord;
  }

  // Message methods
  async getMessages(): Promise<Message[]> {
    return Array.from(this.messages.values());
  }

  async getMessagesByTask(taskId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.taskId === taskId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const message: Message = {
      ...insertMessage,
      id,
      timestamp: new Date()
    };
    this.messages.set(id, message);
    return message;
  }

  // Activity methods
  async getActivities(): Promise<Activity[]> {
    return Array.from(this.activities.values());
  }

  async getRecentActivities(limit: number): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.activityIdCounter++;
    const activity: Activity = {
      ...insertActivity,
      id,
      timestamp: new Date()
    };
    this.activities.set(id, activity);
    return activity;
  }

  // System status methods
  async getSystemStatuses(): Promise<SystemStatusItem[]> {
    return Array.from(this.systemStatuses.values());
  }

  async updateSystemStatus(serviceName: string, statusData: InsertSystemStatusItem): Promise<SystemStatusItem | undefined> {
    const existingStatus = Array.from(this.systemStatuses.values()).find(
      status => status.serviceName === serviceName
    );
    
    if (existingStatus) {
      const updatedStatus: SystemStatusItem = {
        ...existingStatus,
        status: statusData.status,
        details: statusData.details,
        lastUpdated: new Date()
      };
      this.systemStatuses.set(serviceName, updatedStatus);
      return updatedStatus;
    } else {
      const id = this.systemStatusIdCounter++;
      const newStatus: SystemStatusItem = {
        ...statusData,
        id,
        lastUpdated: new Date()
      };
      this.systemStatuses.set(serviceName, newStatus);
      return newStatus;
    }
  }

  // Integration methods
  async getIntegrations(): Promise<Integration[]> {
    return Array.from(this.integrations.values());
  }

  async getIntegration(id: number): Promise<Integration | undefined> {
    return this.integrations.get(id);
  }

  async getIntegrationsByType(type: string): Promise<Integration[]> {
    return Array.from(this.integrations.values()).filter(
      integration => integration.type === type
    );
  }

  async createIntegration(insertIntegration: InsertIntegration): Promise<Integration> {
    const id = this.integrationIdCounter++;
    const integration: Integration = {
      ...insertIntegration,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.integrations.set(id, integration);
    return integration;
  }

  async updateIntegration(id: number, updateData: Partial<InsertIntegration>): Promise<Integration | undefined> {
    const integration = this.integrations.get(id);
    if (!integration) return undefined;
    
    const updatedIntegration: Integration = {
      ...integration,
      ...updateData,
      updatedAt: new Date()
    };
    
    this.integrations.set(id, updatedIntegration);
    return updatedIntegration;
  }

  async deleteIntegration(id: number): Promise<boolean> {
    return this.integrations.delete(id);
  }

  // Agent methods
  async getAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    return this.agents.get(id);
  }

  async getAgentsByType(type: string): Promise<Agent[]> {
    return Array.from(this.agents.values()).filter(
      agent => agent.type === type
    );
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const id = this.agentIdCounter++;
    const agent: Agent = {
      ...insertAgent,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.agents.set(id, agent);
    return agent;
  }

  async updateAgent(id: number, updateData: Partial<InsertAgent>): Promise<Agent | undefined> {
    const agent = this.agents.get(id);
    if (!agent) return undefined;
    
    const updatedAgent: Agent = {
      ...agent,
      ...updateData,
      updatedAt: new Date()
    };
    
    this.agents.set(id, updatedAgent);
    return updatedAgent;
  }

  async deleteAgent(id: number): Promise<boolean> {
    return this.agents.delete(id);
  }
  
  // Citizen Request methods
  async getCitizenRequests(): Promise<CitizenRequest[]> {
    return Array.from(this.citizenRequests.values());
  }
  
  async getCitizenRequest(id: number): Promise<CitizenRequest | undefined> {
    return this.citizenRequests.get(id);
  }
  
  async createCitizenRequest(insertRequest: InsertCitizenRequest): Promise<CitizenRequest> {
    const id = this.citizenRequestIdCounter++;
    const request: CitizenRequest = {
      ...insertRequest,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      aiProcessed: false,
      closedAt: null
    };
    this.citizenRequests.set(id, request);
    return request;
  }
  
  async updateCitizenRequest(id: number, updateData: Partial<InsertCitizenRequest>): Promise<CitizenRequest | undefined> {
    const request = this.citizenRequests.get(id);
    if (!request) return undefined;
    
    const updatedRequest: CitizenRequest = {
      ...request,
      ...updateData,
      updatedAt: new Date(),
      closedAt: updateData.status === "closed" ? new Date() : request.closedAt
    };
    
    this.citizenRequests.set(id, updatedRequest);
    return updatedRequest;
  }
  
  async processCitizenRequestWithAI(id: number): Promise<CitizenRequest | undefined> {
    const request = this.citizenRequests.get(id);
    if (!request) return undefined;
    
    // Имитируем обработку AI
    const citizenRequestAgent = await this.getAgentsByType("citizen_requests").then(agents => agents[0]);
    
    if (!citizenRequestAgent || !citizenRequestAgent.isActive) {
      return request;
    }
    
    // В реальной реализации здесь будет вызов OpenAI API
    const aiClassification = this.classifyRequest(request);
    const aiSuggestion = this.generateResponseSuggestion(request);
    
    const updatedRequest: CitizenRequest = {
      ...request,
      aiProcessed: true,
      aiClassification,
      aiSuggestion,
      updatedAt: new Date()
    };
    
    this.citizenRequests.set(id, updatedRequest);
    
    // Создаем запись активности
    await this.createActivity({
      actionType: "ai_process",
      description: `Запрос от ${request.fullName} автоматически обработан AI агентом`,
      relatedId: id,
      relatedType: "citizen_request",
      userId: null
    });
    
    return updatedRequest;
  }
  
  // Вспомогательные методы для AI обработки (имитация)
  private classifyRequest(request: CitizenRequest): string {
    const types: { [key: string]: string[] } = {
      "Обращение по услугам ЖКХ": ["коммунальные", "водоснабжение", "отопление", "квартира", "дом", "жкх", "квитанция", "счет"],
      "Дорожная инфраструктура": ["дорога", "тротуар", "асфальт", "пешеход", "светофор", "переход", "яма", "ремонт дороги"],
      "Социальная помощь": ["пособие", "льгота", "инвалид", "пенсия", "малоимущий", "многодетная", "субсидия", "выплата"],
      "Образование": ["школа", "детский сад", "колледж", "университет", "институт", "образование", "учеба", "учитель"],
      "Здравоохранение": ["больница", "поликлиника", "врач", "медицинский", "лечение", "прием", "запись", "лекарства"],
      "Вопросы документов": ["документ", "паспорт", "удостоверение", "свидетельство", "справка", "выписка", "регистрация"]
    };
    
    const text = (request.subject + " " + request.description).toLowerCase();
    
    // Находим наиболее подходящую категорию
    let bestMatch = "Общее обращение";
    let maxMatches = 0;
    
    for (const [category, keywords] of Object.entries(types)) {
      const matches = keywords.filter(kw => text.includes(kw)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = category;
      }
    }
    
    return bestMatch;
  }
  
  private generateResponseSuggestion(request: CitizenRequest): string {
    const templates = [
      `Уважаемый(-ая) ${request.fullName}!\n\nБлагодарим Вас за обращение в государственный орган по вопросу "${request.subject}".\n\nВаше обращение принято к рассмотрению и зарегистрировано под номером #${request.id}. Специалисты соответствующего отдела уже приступили к изучению изложенных Вами вопросов.\n\nОтвет по существу Вашего обращения будет предоставлен в установленный законодательством срок.\n\nС уважением,\nАдминистрация`,
      
      `Уважаемый(-ая) ${request.fullName}!\n\nМы получили Ваше обращение по вопросу "${request.subject}" и внимательно рассмотрели описанную Вами ситуацию.\n\nИнформируем, что для решения данного вопроса необходимо предоставить дополнительные документы и обратиться в отдел ${this.classifyRequest(request)}. Также Вы можете решить данный вопрос через портал электронных услуг.\n\nС уважением,\nОтдел по работе с обращениями граждан`,
      
      `Уважаемый(-ая) ${request.fullName}!\n\nВ ответ на Ваше обращение по вопросу "${request.subject}" сообщаем, что в соответствии с действующим законодательством Республики Казахстан, решение данного вопроса находится в компетенции местных исполнительных органов.\n\nВаше обращение перенаправлено в соответствующий орган для дальнейшего рассмотрения. О результатах Вы будете проинформированы дополнительно.\n\nС уважением,\nАдминистрация`
    ];
    
    // Выбираем случайный шаблон
    const randomIndex = Math.floor(Math.random() * templates.length);
    return templates[randomIndex];
  }
}

// Export storage instance
export const storage = new MemStorage();
