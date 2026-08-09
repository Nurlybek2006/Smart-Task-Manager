import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../database/prisma';


export class AuthService {
  async register(email: string, password: string, name: string) {
    // 1. Email бар ма?
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('User already exists');
    }

    // 2. Құпия сөзді хэштеу
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Пайдаланушыны сақтау
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    // 4. JWT токен генерациялау
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return { user: { id: user.id, email: user.email, name: user.name }, token };
  }

  async login(email: string, password: string) {
    // 1. Пайдаланушыны табу
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // 2. Парольді тексеру
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // 3. JWT token жасау
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: '7d',
      }
    );

    // 4. Жауап
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    };
  }
}