import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/auth.routes';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/api/auth', authRoutes);


// 🏠 Қарапайым тест-эндпоинт
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ⚠️ Қателерді өңдеу (error handling)
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Серверді іске қосу
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});