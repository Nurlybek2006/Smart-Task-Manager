declare namespace NodeJS {
  interface ProcessEnv {
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    DATABASE_URL: string;
  }
}