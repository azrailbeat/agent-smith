import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "../storage";
import { InsertUser } from "@shared/schema";

// Проверка наличия необходимых переменных окружения
if (!process.env.REPLIT_DOMAINS) {
  console.warn("REPLIT_DOMAINS не указан. Аутентификация Replit не будет работать корректно.");
}

// Получение конфигурации OIDC с кешированием
const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

// Настройка сессий с хранением в базе данных PostgreSQL
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 неделя
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET ?? "agent-smith-secret-key",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

// Обновление данных пользователя в сессии
function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

// Создание или обновление пользователя в базе данных на основе данных из Replit
async function upsertUser(claims: any) {
  try {
    const userId = parseInt(claims["sub"]);
    const email = claims["email"] || null;
    const username = email ? email.split('@')[0] : `user${userId}`;
    const firstName = claims["first_name"] || "";
    const lastName = claims["last_name"] || "";
    const fullName = `${firstName} ${lastName}`.trim() || username;
    const avatarUrl = claims["profile_image_url"] || null;
    
    // Базовая информация о пользователе
    const basicUserData = {
      username: username,
      email: email,
      fullName: fullName,
      role: "user",
      avatarUrl: avatarUrl,
      isActive: true
    };
    
    // Пробуем найти пользователя
    try {
      const existingUser = await storage.getUser(userId);
      
      if (existingUser) {
        console.log("Пользователь найден в системе, обновляем данные", existingUser);
        // Используем предыдущую роль пользователя, если она есть
        const role = existingUser.role || "user";
        const updatedData = {
          ...basicUserData,
          role: role  // Сохраняем роль пользователя
        };
        
        // Возвращаем обновленные данные пользователя для сессии
        return {...existingUser, ...updatedData};
      }
    } catch (findError) {
      console.log("Пользователь не найден, будет создан новый", findError);
    }
    
    // Создаем нового пользователя
    try {
      // Данные для создания нового пользователя
      const newUserData = {
        ...basicUserData,
        password: `replitauth_${Math.random().toString(36).substring(2)}` // Генерируем случайный пароль
      };
      
      const createdUser = await storage.createUser(newUserData);
      console.log("Создан новый пользователь", createdUser);
      return createdUser;
    } catch (createError) {
      console.error("Ошибка при создании пользователя:", createError);
      // Возвращаем базовые данные для сессии, если не удалось создать пользователя
      return {
        id: userId,
        ...basicUserData
      };
    }
  } catch (error) {
    console.error("Непредвиденная ошибка в upsertUser:", error);
    // Возвращаем минимальный объект пользователя для сессии
    return {
      id: parseInt(claims["sub"]),
      username: claims["email"] ? claims["email"].split('@')[0] : `user${claims["sub"]}`,
      email: claims["email"] || null,
      role: "user",
      isActive: true
    };
  }
}

// Основная функция настройки аутентификации
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  // Функция проверки при аутентификации
  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const user: any = {};
      updateUserSession(user, tokens);
      
      // Создаем или обновляем пользователя в базе данных
      const dbUser = await upsertUser(tokens.claims());
      
      // Добавляем данные из БД в объект пользователя сессии
      user.db = dbUser;
      user.role = dbUser.role;
      // Проверяем наличие свойства departmentId перед присвоением
      if ('departmentId' in dbUser) {
        user.departmentId = dbUser.departmentId;
      }
      
      verified(null, user);
    } catch (error) {
      console.error("Ошибка при верификации пользователя:", error);
      verified(error as Error);
    }
  };

  // Регистрируем стратегию для каждого домена
  for (const domain of process.env.REPLIT_DOMAINS?.split(",") || []) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/auth/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  // Сериализация и десериализация пользователя
  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Маршрут входа в систему
  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });
  
  // Дополнительный маршрут для совместимости
  app.get("/api/auth/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  // Маршрут обратного вызова после аутентификации
  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });
  
  // Дополнительный маршрут обратного вызова для совместимости
  app.get("/api/auth/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  // Маршрут выхода из системы
  app.get("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
  
  // Маршрут для получения информации о текущем пользователе
  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated() && req.user) {
      const user = (req.user as any).db || {};
      const claims = (req.user as any).claims || {};
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email || claims.email,
        firstName: user.firstName || claims.first_name,
        lastName: user.lastName || claims.last_name,
        profileImageUrl: user.profileImageUrl || claims.profile_image_url,
        role: user.role || "user",
        departmentId: user.departmentId || null,
        isAuthenticated: true
      });
    } else {
      res.json({ isAuthenticated: false });
    }
  });
}

// Middleware для проверки аутентификации
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Проверка аутентификации
  if (!req.isAuthenticated()) {
    return res.status(401).json({ 
      message: "Требуется аутентификация", 
      redirectUrl: "/api/auth/login" 
    });
  }
  
  const user = req.user as any;
  
  // Проверка срока действия токена
  if (user.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    if (now <= user.expires_at) {
      return next();
    }
    
    // Пробуем обновить токен, если срок действия истек
    const refreshToken = user.refresh_token;
    if (!refreshToken) {
      return res.redirect("/api/auth/login");
    }
    
    try {
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      updateUserSession(user, tokenResponse);
      return next();
    } catch (error) {
      console.error("Ошибка при обновлении токена:", error);
      return res.redirect("/api/auth/login");
    }
  }
  
  next();
};

// Middleware для проверки роли пользователя
export const hasRole = (roles: string | string[]): RequestHandler => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        message: "Требуется аутентификация",
        redirectUrl: "/api/auth/login" 
      });
    }
    
    const user = req.user as any;
    const userRole = user.role || user.db?.role;
    
    if (!userRole) {
      return res.status(403).json({ 
        message: "Доступ запрещен: роль пользователя не определена" 
      });
    }
    
    // Суперадминистраторы имеют доступ ко всему
    if (userRole === "superadmin") {
      return next();
    }
    
    // Проверка, имеет ли пользователь одну из указанных ролей
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (allowedRoles.includes(userRole)) {
      return next();
    }
    
    res.status(403).json({ 
      message: "Доступ запрещен: недостаточно прав" 
    });
  };
};

// Middleware для проверки, является ли пользователь администратором
export const isAdmin: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ 
      message: "Требуется аутентификация",
      redirectUrl: "/api/auth/login" 
    });
  }
  
  const user = req.user as any;
  const userRole = user.role || user.db?.role;
  
  if (userRole === "admin" || userRole === "superadmin") {
    return next();
  }
  
  res.status(403).json({ 
    message: "Доступ запрещен: требуются права администратора" 
  });
};