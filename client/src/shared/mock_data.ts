// Тестовые данные для организационной структуры
// Используются только при разработке, в продакшене замените на реальное API

// Отделы
export const departments = [
  { id: 1, name: 'Руководство', description: 'Высшее руководство организации', parentId: null },
  { id: 2, name: 'Канцелярия', description: 'Отдел документооборота и делопроизводства', parentId: null },
  { id: 3, name: 'IT отдел', description: 'Отдел информационных технологий', parentId: null },
  { id: 4, name: 'Отдел кадров', description: 'Управление персоналом', parentId: null },
  { id: 5, name: 'Юридический отдел', description: 'Юридическое сопровождение', parentId: null },
];

// Должности
export const positions = [
  { id: 1, name: 'Директор', departmentId: 1, level: 0 },
  { id: 2, name: 'Заместитель директора', departmentId: 1, level: 1 },
  { id: 3, name: 'Начальник IT-отдела', departmentId: 3, level: 2 },
  { id: 4, name: 'Инженер-программист', departmentId: 3, level: 3 },
  { id: 5, name: 'Системный администратор', departmentId: 3, level: 3 },
  { id: 6, name: 'Начальник канцелярии', departmentId: 2, level: 2 },
  { id: 7, name: 'Делопроизводитель', departmentId: 2, level: 4 },
  { id: 8, name: 'Начальник отдела кадров', departmentId: 4, level: 2 },
  { id: 9, name: 'HR-специалист', departmentId: 4, level: 3 },
  { id: 10, name: 'Начальник юридического отдела', departmentId: 5, level: 2 },
  { id: 11, name: 'Юрист', departmentId: 5, level: 3 },
];

// Сотрудники
export const employees = [
  { id: 1, fullName: 'Иванов Иван Иванович', departmentId: 1, positionId: 1, email: 'ivanov@example.com' },
  { id: 2, fullName: 'Петров Петр Петрович', departmentId: 1, positionId: 2, email: 'petrov@example.com' },
  { id: 3, fullName: 'Сидоров Сидор Сидорович', departmentId: 3, positionId: 3, email: 'sidorov@example.com' },
  { id: 4, fullName: 'Кузнецова Анна Ивановна', departmentId: 2, positionId: 6, email: 'kuznetsova@example.com' },
  { id: 5, fullName: 'Смирнов Алексей Петрович', departmentId: 3, positionId: 4, email: 'smirnov@example.com' },
  { id: 6, fullName: 'Новикова Елена Сергеевна', departmentId: 4, positionId: 8, email: 'novikova@example.com' },
  { id: 7, fullName: 'Морозов Дмитрий Александрович', departmentId: 5, positionId: 10, email: 'morozov@example.com' },
  { id: 8, fullName: 'Волкова Ольга Викторовна', departmentId: 5, positionId: 11, email: 'volkova@example.com' },
  { id: 9, fullName: 'Зайцев Николай Владимирович', departmentId: 3, positionId: 5, email: 'zaitsev@example.com' },
  { id: 10, fullName: 'Соколова Мария Андреевна', departmentId: 4, positionId: 9, email: 'sokolova@example.com' },
];

// Правила распределения задач
export const distributionRules = [
  {
    id: 1,
    name: 'Запросы по IT-поддержке',
    description: 'Распределение запросов, связанных с технической поддержкой',
    departmentId: 3,
    positionId: 4,
    priority: 80
  },
  {
    id: 2,
    name: 'Юридические вопросы',
    description: 'Распределение запросов по правовым вопросам',
    departmentId: 5,
    positionId: null,
    priority: 75
  },
  {
    id: 3,
    name: 'Кадровые вопросы',
    description: 'Распределение запросов по трудоустройству и кадровой работе',
    departmentId: 4,
    positionId: 9,
    priority: 70
  },
  {
    id: 4,
    name: 'Системное администрирование',
    description: 'Задачи по администрированию серверов и сетей',
    departmentId: 3,
    positionId: 5,
    priority: 65
  },
  {
    id: 5,
    name: 'Документооборот',
    description: 'Обработка и регистрация документов',
    departmentId: 2,
    positionId: 7,
    priority: 60
  }
];