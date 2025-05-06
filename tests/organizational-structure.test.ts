import request from 'supertest';
import { Express } from 'express';
import { Server } from 'http';

// Получаем приложение Express, но предотвращаем запуск сервера
const importApp = async () => {
  // Храним оригинальный метод listen
  const originalListen = Server.prototype.listen;
  // Переопределяем метод listen, чтобы он не запускал сервер на порту
  // @ts-ignore - игнорируем TypeScript ошибку из-за переопределения метода
  Server.prototype.listen = function() {
    // Восстанавливаем оригинальный метод
    Server.prototype.listen = originalListen;
    // Возвращаем this для цепочки вызовов
    return this;
  };
  
  // Импортируем app для тестирования
  const { app } = await import('../server/routes');
  
  // Восстанавливаем оригинальный метод listen
  Server.prototype.listen = originalListen;
  
  return app;
};

describe('Organizational Structure Tests', () => {
  let app: Express;
  let departmentId: number;
  let positionId: number;
  let employeeId: number;
  
  beforeAll(async () => {
    app = await importApp();
  });
  
  describe('Departments and Positions Management', () => {
    it('should create a new department', async () => {
      const newDepartment = {
        name: 'Тестовый департамент',
        description: 'Департамент для тестирования организационной структуры',
        code: 'TEST-DEPT',
        isActive: true
      };
      
      const response = await request(app)
        .post('/api/departments')
        .send(newDepartment);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newDepartment.name);
      
      departmentId = response.body.id;
    });
    
    it('should create a new position for the department', async () => {
      if (!departmentId) {
        throw new Error('Department ID not set, cannot continue test');
      }
      
      const newPosition = {
        name: 'Тестовая должность',
        departmentId: departmentId,
        description: 'Должность для тестирования',
        responsibilities: 'Тестирование системы и проверка связей',
        isActive: true
      };
      
      const response = await request(app)
        .post('/api/positions')
        .send(newPosition);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newPosition.name);
      expect(response.body.departmentId).toBe(departmentId);
      
      positionId = response.body.id;
    });
    
    it('should create a new employee for the position', async () => {
      if (!positionId) {
        throw new Error('Position ID not set, cannot continue test');
      }
      
      const newEmployee = {
        firstName: 'Тестовый',
        lastName: 'Сотрудник',
        email: 'test.employee@example.com',
        positionId: positionId,
        departmentId: departmentId,
        isActive: true
      };
      
      const response = await request(app)
        .post('/api/employees')
        .send(newEmployee);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.firstName).toBe(newEmployee.firstName);
      expect(response.body.positionId).toBe(positionId);
      expect(response.body.departmentId).toBe(departmentId);
      
      employeeId = response.body.id;
    });
    
    it('should retrieve department with associated positions', async () => {
      if (!departmentId) {
        throw new Error('Department ID not set, cannot continue test');
      }
      
      const response = await request(app).get(`/api/departments/${departmentId}?include=positions`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', departmentId);
      expect(response.body).toHaveProperty('positions');
      expect(Array.isArray(response.body.positions)).toBe(true);
      
      // Проверяем, что созданная должность включена в ответ
      if (response.body.positions.length > 0) {
        const foundPosition = response.body.positions.find((pos: any) => pos.id === positionId);
        expect(foundPosition).toBeDefined();
      }
    });
    
    it('should retrieve position with associated employees', async () => {
      if (!positionId) {
        throw new Error('Position ID not set, cannot continue test');
      }
      
      const response = await request(app).get(`/api/positions/${positionId}?include=employees`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', positionId);
      expect(response.body).toHaveProperty('employees');
      expect(Array.isArray(response.body.employees)).toBe(true);
      
      // Проверяем, что созданный сотрудник включен в ответ
      if (response.body.employees.length > 0) {
        const foundEmployee = response.body.employees.find((emp: any) => emp.id === employeeId);
        expect(foundEmployee).toBeDefined();
      }
    });
  });
  
  describe('Organizational Structure and Citizen Requests Integration', () => {
    it('should assign a citizen request to an employee', async () => {
      if (!employeeId) {
        throw new Error('Employee ID not set, cannot continue test');
      }
      
      // Создаем новый запрос гражданина
      const newRequest = {
        fullName: 'Тестовый Гражданин',
        contactInfo: 'test.citizen@example.com',
        subject: 'Тестовый запрос для проверки назначений',
        description: 'Проверка назначения запроса на сотрудника.',
        status: 'new',
        priority: 'medium'
      };
      
      const createResponse = await request(app)
        .post('/api/citizen-requests')
        .send(newRequest);
      
      expect(createResponse.status).toBe(201);
      const requestId = createResponse.body.id;
      
      // Назначаем запрос сотруднику
      const assignResponse = await request(app)
        .post(`/api/citizen-requests/${requestId}/assign`)
        .send({ employeeId });
      
      expect(assignResponse.status).toBe(200);
      expect(assignResponse.body).toHaveProperty('success', true);
      
      // Проверяем, что запрос был назначен правильно
      const getResponse = await request(app).get(`/api/citizen-requests/${requestId}`);
      
      expect(getResponse.status).toBe(200);
      expect(getResponse.body).toHaveProperty('assignedTo', employeeId);
      expect(getResponse.body).toHaveProperty('status', 'in_progress');
      
      // Удаляем тестовый запрос
      await request(app).delete(`/api/citizen-requests/${requestId}`);
    });
  });
  
  // Очистка после тестов
  afterAll(async () => {
    // Удаляем созданного сотрудника
    if (employeeId) {
      await request(app).delete(`/api/employees/${employeeId}`);
    }
    
    // Удаляем созданную должность
    if (positionId) {
      await request(app).delete(`/api/positions/${positionId}`);
    }
    
    // Удаляем созданный департамент
    if (departmentId) {
      await request(app).delete(`/api/departments/${departmentId}`);
    }
  });
});