import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import passport from 'passport';
import { connectDB } from './config/db';
import { configurePassport } from './config/passport';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import scanRoutes from './routes/scanRoutes';
import reportRoutes from './routes/reportRoutes';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  }),
);
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(passport.initialize());

configurePassport();

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'PulseIQ API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/reports', reportRoutes);

app.use(errorHandler);

async function start() {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`PulseIQ API running on port ${env.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
