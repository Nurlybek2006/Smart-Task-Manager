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
import ExcelJS from 'exceljs';

import app from '../src/app';
import prisma from '../src/database/prisma';
import redisConnection from '../src/config/redis';

describe('Excel Import / Export API', () => {
  const testEmail = `excel-${Date.now()}@test.com`;
  const password = '123456';

  let token = '';
  let userId = '';

  beforeAll(async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password,
        name: 'Excel Test User',
      });

    token = registerResponse.body.token;
    userId = registerResponse.body.user.id;

    // Export тексеру үшін бір Task жасаймыз
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Excel Export Test',
        description: 'Export test task',
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

  it('GET /api/tasks/export/excel should export Excel file', async () => {
    const response = await request(app)
      .get('/api/tasks/export/excel')
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          callback(null, Buffer.concat(chunks));
        });
      });

    expect(response.status).toBe(200);

    expect(response.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);

    // ExcelJS арқылы файлдың өзін оқимыз
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.load(response.body);

    const worksheet = workbook.worksheets[0];

    expect(worksheet).toBeDefined();

    let taskFound = false;

    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.value === 'Excel Export Test') {
          taskFound = true;
        }
      });
    });

    expect(taskFound).toBe(true);
  });

  it('POST /api/tasks/import/excel should import tasks', async () => {
    // Excel файлын RAM ішінде жасаймыз
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Tasks');

    worksheet.columns = [
      {
        header: 'Title',
        key: 'title',
        width: 30,
      },
      {
        header: 'Description',
        key: 'description',
        width: 40,
      },
      {
        header: 'Status',
        key: 'status',
        width: 15,
      },
      {
        header: 'Priority',
        key: 'priority',
        width: 15,
      },
      {
        header: 'Due Date',
        key: 'dueDate',
        width: 20,
      },
    ];

    worksheet.addRow({
      title: 'Imported Jest Task',
      description: 'Created from Jest Excel test',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: '2026-08-30',
    });

    const excelBuffer = await workbook.xlsx.writeBuffer();

    const response = await request(app)
      .post('/api/tasks/import/excel')
      .set('Authorization', `Bearer ${token}`)
      .attach(
        'file',
        Buffer.from(excelBuffer),
        'test-import.xlsx'
      );

    expect(response.status).toBe(201);

    expect(response.body.imported).toBe(1);

    expect(response.body.tasks).toHaveLength(1);

    expect(response.body.tasks[0].title).toBe(
      'Imported Jest Task'
    );

    expect(response.body.tasks[0].priority).toBe(
      'HIGH'
    );

    // Database-қа шынымен сақталды ма?
    const importedTask = await prisma.task.findFirst({
      where: {
        creatorId: userId,
        title: 'Imported Jest Task',
      },
    });

    expect(importedTask).not.toBeNull();

    expect(importedTask?.priority).toBe('HIGH');
  });
});