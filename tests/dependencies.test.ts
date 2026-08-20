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

describe('Task Dependencies API', () => {
  const testEmail = `dependency-${Date.now()}@test.com`;
  const testPassword = '123456';
  const testName = 'Dependency Test User';

  let token = '';
  let userId = '';

  let backendTaskId = '';
  let frontendTaskId = '';
  let dependencyId = '';

  beforeAll(async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: testName,
      });

    token = registerResponse.body.token;
    userId = registerResponse.body.user.id;

    const backendTask = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Backend API',
      });

    backendTaskId = backendTask.body.id;

    const frontendTask = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Frontend API',
      });

    frontendTaskId = frontendTask.body.id;
  });

  afterAll(async () => {
    await prisma.taskDependency.deleteMany({
      where: {
        OR: [
          { blockedTaskId: frontendTaskId },
          { blockingTaskId: backendTaskId },
        ],
      },
    });

    await prisma.task.deleteMany({
      where: {
        creatorId: userId,
      },
    });

    await prisma.user.delete({
      where: {
        id: userId,
      },
    });

    await prisma.$disconnect();
    await redisConnection.quit();
  });

  it('should add dependency', async () => {
    const response = await request(app)
      .post(`/api/tasks/${frontendTaskId}/dependencies`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        blockingTaskId: backendTaskId,
      });

    expect(response.status).toBe(201);

    expect(response.body.blockedTaskId).toBe(frontendTaskId);
    expect(response.body.blockingTaskId).toBe(backendTaskId);

    dependencyId = response.body.id;
  });

  it('should get dependencies', async () => {
    const response = await request(app)
      .get(`/api/tasks/${frontendTaskId}/dependencies`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);

    expect(response.body[0].blockingTask.id).toBe(
      backendTaskId
    );
  });

  it('should block frontend task while backend task is not DONE', async () => {
    const response = await request(app)
      .put(`/api/tasks/${frontendTaskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'IN_PROGRESS',
      });

    expect(response.status).toBe(409);

    expect(response.body.error).toContain(
      'Task is blocked by unfinished tasks'
    );
  });

  it('should allow backend task to become DONE', async () => {
    const response = await request(app)
      .put(`/api/tasks/${backendTaskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'DONE',
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('DONE');
  });

  it('should allow frontend task after dependency is DONE', async () => {
    const response = await request(app)
      .put(`/api/tasks/${frontendTaskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'IN_PROGRESS',
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('IN_PROGRESS');
  });

  it('should remove dependency', async () => {
    const response = await request(app)
      .delete(
        `/api/tasks/${frontendTaskId}/dependencies/${dependencyId}`
      )
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    expect(response.body.message).toBe(
      'Dependency removed successfully'
    );
  });
});