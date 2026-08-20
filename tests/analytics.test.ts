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

describe('Analytics API', () => {
  const testEmail = `analytics-${Date.now()}@test.com`;
  const password = '123456';

  let token = '';
  let userId = '';

  beforeAll(async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password,
        name: 'Analytics Test User',
      });

    token = registerResponse.body.token;
    userId = registerResponse.body.user.id;

    // TODO
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'TODO Task',
      });

    // IN_PROGRESS
    const inProgress = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'In Progress Task',
      });

    await request(app)
      .put(`/api/tasks/${inProgress.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'IN_PROGRESS',
      });

    // DONE
    const done = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Done Task',
      });

    await request(app)
      .put(`/api/tasks/${done.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'DONE',
      });

    // OVERDUE
    const pastDate = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Overdue Task',
        dueDate: pastDate,
      });
  });

  afterAll(async () => {
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

  it('GET /api/tasks/analytics/summary should return correct analytics', async () => {
    const response = await request(app)
      .get('/api/tasks/analytics/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    expect(response.body.total).toBe(4);
    expect(response.body.todo).toBe(2);
    expect(response.body.inProgress).toBe(1);
    expect(response.body.done).toBe(1);
    expect(response.body.review).toBe(0);
    expect(response.body.overdue).toBe(1);

    expect(response.body.completionRate).toBe(25);
  });
});