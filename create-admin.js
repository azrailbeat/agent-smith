// Script to create an admin user
const bcrypt = require('bcrypt');
const { storage } = require('./server/storage');
const { UserRole } = require('./shared/schema');

async function createAdminUser() {
  try {
    // Проверяем, существует ли уже пользователь с таким именем
    const existingUser = await storage.getUserByUsername('azrail');
    
    if (existingUser) {
      console.log('Пользователь azrail уже существует');
      return;
    }
    
    // Хешируем пароль
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('n3v3rm0r3', saltRounds);
    
    // Создаем пользователя
    const newUser = await storage.createUser({
      username: 'azrail',
      password: hashedPassword,
      fullName: 'Azrail Admin',
      role: UserRole.ADMIN,
      email: 'admin@example.com',
      isActive: true
    });
    
    console.log('Создан администратор:', newUser);
  } catch (error) {
    console.error('Ошибка при создании администратора:', error);
  }
}

createAdminUser();