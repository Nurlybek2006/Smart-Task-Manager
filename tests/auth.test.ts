import request from 'supertest';
import app from '../src/app';
import redisConnection from '../src/config/redis';
import prisma from '../src/database/prisma';

describe('Auth API', () => {
  const testEmail = `test-${Date.now()}@test.com`;
  const testPassword = '123456';
  const testName = 'Test User';

  let token = '';

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: testEmail,
      },
    });

    await prisma.$disconnect();
    await redisConnection.quit();
  });

  it('POST /api/auth/register should register user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: testName,
      });

    expect(response.status).toBe(201);

    expect(response.body.user.email).toBe(testEmail);
    expect(response.body.user.name).toBe(testName);

    expect(response.body.token).toBeDefined();
  });

  it('POST /api/auth/login should login user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(response.status).toBe(200);

    expect(response.body.user.email).toBe(testEmail);
    expect(response.body.token).toBeDefined();

    token = response.body.token;
  });

  it('GET /api/auth/me should return current user', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set(
        'Authorization',
        `Bearer ${token}`
      );

    expect(response.status).toBe(200);

    expect(response.body.email).toBe(testEmail);
    expect(response.body.name).toBe(testName);
  });

  it('GET /api/auth/me without token should return 401', async () => {
    const response = await request(app)
      .get('/api/auth/me');

    expect(response.status).toBe(401);
  });
});