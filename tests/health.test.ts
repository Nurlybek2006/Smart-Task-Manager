import request from 'supertest';
import app from '../src/app';
import redisConnection from '../src/config/redis';

describe('Health API', () => {
  afterAll(async () => {
    await redisConnection.quit();
  });

  it('GET /health should return 200', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
  });
});