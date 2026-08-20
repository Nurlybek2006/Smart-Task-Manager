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

describe('Task Assignment & Permissions', () => {
  const creatorEmail = `creator-${Date.now()}@test.com`;
  const assigneeEmail = `assignee-${Date.now()}@test.com`;
  const password = '123456';

  let creatorToken = '';
  let creatorId = '';

  let assigneeToken = '';
  let assigneeId = '';

  let taskId = '';

  beforeAll(async () => {
    // Creator
    const creatorResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: creatorEmail,
        password,
        name: 'Creator User',
      });

    creatorToken = creatorResponse.body.token;
    creatorId = creatorResponse.body.user.id;

    // Assignee
    const assigneeResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: assigneeEmail,
        password,
        name: 'Assignee User',
      });

    assigneeToken = assigneeResponse.body.token;
    assigneeId = assigneeResponse.body.user.id;

    // Creator task жасайды
    const taskResponse = await request(app)
      .post('/api/tasks')
      .set(
        'Authorization',
        `Bearer ${creatorToken}`
      )
      .send({
        title: 'Assignment Test Task',
      });

    taskId = taskResponse.body.id;
  });

  afterAll(async () => {
    await prisma.taskDependency.deleteMany({
      where: {
        OR: [
          { blockedTaskId: taskId },
          { blockingTaskId: taskId },
        ],
      },
    });

    await prisma.task.deleteMany({
      where: {
        OR: [
          { creatorId },
          { creatorId: assigneeId },
        ],
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: [creatorId, assigneeId],
        },
      },
    });

    await prisma.$disconnect();
    await redisConnection.quit();
  });

  it('creator should assign task to another user', async () => {
    const response = await request(app)
      .patch(`/api/tasks/${taskId}/assign`)
      .set(
        'Authorization',
        `Bearer ${creatorToken}`
      )
      .send({
        assigneeId,
      });

    expect(response.status).toBe(200);
    expect(response.body.assigneeId).toBe(
      assigneeId
    );

    expect(response.body.assignee.id).toBe(
      assigneeId
    );
  });

  it('assignee should see assigned task in task list', async () => {
    const response = await request(app)
      .get('/api/tasks')
      .set(
        'Authorization',
        `Bearer ${assigneeToken}`
      );

    expect(response.status).toBe(200);

    const assignedTask =
      response.body.tasks.find(
        (task: any) => task.id === taskId
      );

    expect(assignedTask).toBeDefined();
    expect(assignedTask.assigneeId).toBe(
      assigneeId
    );
  });

  it('assignee should get assigned task by ID', async () => {
    const response = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set(
        'Authorization',
        `Bearer ${assigneeToken}`
      );

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(taskId);
  });

  it('assignee should NOT update creator task', async () => {
    const response = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set(
        'Authorization',
        `Bearer ${assigneeToken}`
      )
      .send({
        title: 'Hacked title',
      });

    expect(response.status).toBe(404);

    expect(response.body.error).toBe(
      'Task not found'
    );
  });

  it('assignee should NOT delete creator task', async () => {
    const response = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set(
        'Authorization',
        `Bearer ${assigneeToken}`
      );

    expect(response.status).toBe(404);

    expect(response.body.error).toBe(
      'Task not found'
    );
  });

  it('assignee should NOT reassign creator task', async () => {
    const response = await request(app)
      .patch(`/api/tasks/${taskId}/assign`)
      .set(
        'Authorization',
        `Bearer ${assigneeToken}`
      )
      .send({
        assigneeId: creatorId,
      });

    expect(response.status).toBe(404);

    expect(response.body.error).toBe(
      'Task not found'
    );
  });

  it('creator should delete own task', async () => {
    const response = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set(
        'Authorization',
        `Bearer ${creatorToken}`
      );

    expect(response.status).toBe(200);

    expect(response.body.message).toBe(
      'Task deleted successfully'
    );
  });
});