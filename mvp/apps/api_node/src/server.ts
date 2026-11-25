import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { initSentry } from './config/sentry.js';
import { apiRouter } from './routes/api.js';
import { authRouter } from './routes/auth.js';
import { billingRouter } from './routes/billing.js';

const app = express();

app.use(helmet());
app.use(cors());

// Mount Stripe webhook before JSON body parser so raw signature payload is preserved
app.use('/api/v1/billing/webhook', billingRouter);

app.use(express.json({ limit: '12mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'ecompilot-api', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/billing', billingRouter);
app.use('/api/v1', apiRouter);

initSentry(app);

app.listen(env.port, '0.0.0.0', () => {
  console.log(`EcomPilot production API listening on port ${env.port}`);
});
