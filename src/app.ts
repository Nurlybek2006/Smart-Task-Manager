import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import authRoutes from './modules/auth/auth.routes';
import taskRoutes from './modules/tasks/task.routes';

import { swaggerSpec } from './config/swagger';
import { env } from './config/env';

import {
  apiLimiter,
  authLimiter,
} from './middleware/rateLimit.middleware';

import { errorMiddleware } from './middleware/error.middleware';

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: '100kb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '100kb',
  })
);



if (env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

if (env.NODE_ENV !== 'test') {
  app.use('/api', apiLimiter);
  app.use('/api/auth', authLimiter);
}

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

if (env.ENABLE_SWAGGER) {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
  );
}

app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

app.use(errorMiddleware);

export default app;