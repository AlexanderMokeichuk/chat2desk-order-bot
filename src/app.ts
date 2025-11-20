import express from 'express';
import { WebhookController } from '@controllers/webhook.controller';
import { HealthController } from '@controllers/health.controller';
import { loggingMiddleware } from '@middleware/logging.middleware';
import { errorHandler } from '@middleware/error.middleware';

const app = express();

app.use(express.json());
app.use(loggingMiddleware);

const webhookController = new WebhookController();
const healthController = new HealthController();

app.post('/webhook/chat2desk', (req, res) => webhookController.handleChat2DeskWebhook(req, res));
app.get('/health', (req, res) => healthController.checkHealth(req, res));

app.get('/', (_req, res) => {
  res.json({
    name: 'Shoro Chat2Desk Bot',
    version: '0.1.0',
    status: 'running',
  });
});

app.use(errorHandler);

export default app;
