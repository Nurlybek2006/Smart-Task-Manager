import IORedis from 'ioredis';
declare const redisConnection: IORedis<"legacy">;
export default redisConnection;
