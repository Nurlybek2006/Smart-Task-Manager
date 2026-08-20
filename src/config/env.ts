const requiredEnvVariables = [
  'DATABASE_URL',
  'JWT_SECRET',
  'REDIS_URL',
  'CLIENT_URL',
] as const;

for (const key of requiredEnvVariables) {
  if (!process.env[key]) {
    throw new Error(
      `Missing required environment variable: ${key}`
    );
  }
}

const port = Number(process.env.PORT || 3000);

if (Number.isNaN(port)) {
  throw new Error('PORT must be a number');
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',

  PORT: port,

  DATABASE_URL: process.env.DATABASE_URL!,

  JWT_SECRET: process.env.JWT_SECRET!,

  JWT_EXPIRES_IN:
    process.env.JWT_EXPIRES_IN || '7d',

  REDIS_URL: process.env.REDIS_URL!,

  CLIENT_URL: process.env.CLIENT_URL!,

  ENABLE_SWAGGER:
    process.env.ENABLE_SWAGGER === 'true',
};