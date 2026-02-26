import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { logger } from './logger.js';
import { errorHandler } from './middleware/error-handler.js';

// Route imports
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import studentsRouter from './routes/students.js';
import screeningsRouter from './routes/screenings.js';
import appointmentsRouter from './routes/appointments.js';
import advisoryRouter from './routes/advisory.js';
import clinicalRouter from './routes/clinical.js';
import analyticsRouter from './routes/analytics.js';
import lineWebhookRouter from './routes/line-webhook.js';
import resourcesRouter from './routes/resources.js';

const app = express();

// ─── Global Middleware ───

// Security headers
app.use(helmet());

// CORS
app.use(cors({
    origin: config.NODE_ENV === 'production'
        ? [
            'https://admin.mentalhealth.northbkk.ac.th',
            'https://liff.mentalhealth.northbkk.ac.th',
          ]
        : '*',
    credentials: true,
}));

// Body parsing — special handling for LINE webhook (needs raw body)
app.use('/webhooks/line', express.json({
    verify: (req: any, _res, buf) => {
        // Store raw body for LINE signature verification
        req.rawBody = buf;
    },
}));

// JSON body parsing for all other routes
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
    logger.debug({ method: req.method, path: req.path }, 'Request');
    next();
});

// ─── Routes ───

app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/students', studentsRouter);
app.use('/screenings', screeningsRouter);
app.use('/appointments', appointmentsRouter);
app.use('/advisory', advisoryRouter);
app.use('/clinical', clinicalRouter);
app.use('/analytics', analyticsRouter);
app.use('/webhooks/line', lineWebhookRouter);
app.use('/resources', resourcesRouter);

// ─── Error Handler ───

app.use(errorHandler);

// ─── Start ───

app.listen(config.PORT, () => {
    logger.info({
        port: config.PORT,
        env: config.NODE_ENV,
    }, `🚀 NBU Mental Health API running on port ${config.PORT}`);
});

export default app;
