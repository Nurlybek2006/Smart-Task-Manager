jest.mock('../src/config/socket', () => {
  const emit = jest.fn();

  return {
    getIO: jest.fn(() => ({
      emit,
      to: jest.fn(() => ({
        emit,
      })),
    })),
  };
});

import request from 'supertest';
import app from '../src/app';
import prisma from '../src/database/prisma';
import redisConnection from '../src/config/redis';

describe('Tasks API', () => {
  const testEmail = `tasks-${Date.now()}@test.com`;
  const testPassword = '123456';
  const testName = 'Task Test User';

  let token = '';
  let userId = '';
  let taskId = '';

  beforeAll(async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: testName,
      });

    token = response.body.token;
    userId = response.body.user.id;
  });

  afterAll(async () => {
    await prisma.task.deleteMany({
      where: {
        creatorId: userId,
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: userId,
      },
    });

    await prisma.$disconnect();
    await redisConnection.quit();
  });

  it('POST /api/tasks should create task', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Jest Task',
        description: 'Task created by integration test',
      });

    expect(response.status).toBe(201);

    expect(response.body.title).toBe('Jest Task');
    expect(response.body.creatorId).toBe(userId);

    taskId = response.body.id;

    expect(taskId).toBeDefined();
  });

  it('GET /api/tasks/:id should return task', async () => {
    const response = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    expect(response.body.id).toBe(taskId);
    expect(response.body.title).toBe('Jest Task');
  });

  it('GET /api/tasks should return tasks', async () => {
    const response = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    expect(Array.isArray(response.body.tasks)).toBe(true);

    const createdTask = response.body.tasks.find(
      (task: any) => task.id === taskId
    );

    expect(createdTask).toBeDefined();
  });

  it('PUT /api/tasks/:id should update task', async () => {
    const response = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Updated Jest Task',
        status: 'IN_PROGRESS',
      });

    expect(response.status).toBe(200);

    expect(response.body.title).toBe('Updated Jest Task');
    expect(response.body.status).toBe('IN_PROGRESS');
  });

  it('DELETE /api/tasks/:id should delete task', async () => {
    const response = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    expect(response.body.message).toBe(
      'Task deleted successfully'
    );
  });

  it('GET deleted task should return 404', async () => {
    const response = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
  });
});