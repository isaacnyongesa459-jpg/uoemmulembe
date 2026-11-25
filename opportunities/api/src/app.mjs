import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { fileURLToPath } from 'node:url';
import { DEFAULT_ALLOWED_ORIGINS } from './config.mjs';
import { consoleLogger, requestLoggerMiddleware } from './http/request-logger.mjs';
import { requestIdMiddleware } from './http/request-id.mjs';
import { parseOpportunityQuery } from './validation/opportunity-query.mjs';

const PUBLIC_DIRECTORY = fileURLToPath(new URL('../public/', import.meta.url));
const OPPORTUNITY_ID = /^[a-f0-9]{64}$/iu;

function sendError(response, request, status, code, message, extra = {}) {
  response.status(status).json({
    error: { code, message, ...extra },
    requestId: request.requestId,
  });
}

export function createApp({
  repository,
  checkDatabase,
  allowedOrigins = DEFAULT_ALLOWED_ORIGINS,
  rateLimitWindowMs = 60_000,
  rateLimitMax = 120,
  logger = consoleLogger,
} = {}) {
  if (!repository || typeof repository.listPublic !== 'function' || typeof repository.getPublicById !== 'function') {
    throw new TypeError('An opportunity repository is required.');
  }
  if (typeof checkDatabase !== 'function') {
    throw new TypeError('A database readiness check is required.');
  }

  const originAllowlist = new Set(allowedOrigins);
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    frameguard: false,
  }));
  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware(logger));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || originAllowlist.has(origin)) {
        callback(null, true);
        return;
      }
      const error = new Error('Origin is not allowed.');
      error.status = 403;
      error.code = 'origin_not_allowed';
      callback(error);
    },
    methods: ['GET', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Request-Id'],
    maxAge: 86_400,
    optionsSuccessStatus: 204,
  }));
  app.use(express.static(PUBLIC_DIRECTORY, {
    fallthrough: true,
    index: false,
    maxAge: 0,
    setHeaders(response) {
      response.setHeader('Cache-Control', 'no-cache');
    },
  }));

  const apiLimiter = rateLimit({
    windowMs: rateLimitWindowMs,
    limit: rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (request) => request.method === 'OPTIONS'
      || request.path === '/health'
      || request.path === '/ready',
    handler(request, response) {
      sendError(response, request, 429, 'rate_limited', 'Please wait before making more API requests.');
    },
  });

  const api = express.Router();
  api.use((request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });

  api.get('/health', (request, response) => {
    response.status(200).json({
      status: 'ok',
      service: 'mulembe-union-opportunities-api',
      timestamp: new Date().toISOString(),
    });
  });

  api.get('/ready', async (request, response) => {
    try {
      await checkDatabase();
      response.status(200).json({ status: 'ready', checks: { database: 'ok' } });
    } catch {
      response.status(503).json({ status: 'not_ready', checks: { database: 'unavailable' } });
    }
  });

  api.get('/v1/opportunities', async (request, response) => {
    const parsed = parseOpportunityQuery(request.query);
    if (!parsed.success) {
      sendError(response, request, 400, 'invalid_query', 'One or more query parameters are invalid.', {
        issues: parsed.issues,
      });
      return;
    }

    const result = await repository.listPublic(parsed.data);
    const total = Number(result.total ?? 0);
    const { page, pageSize } = parsed.data;
    response.status(200).json({
      data: result.data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        hasNextPage: page * pageSize < total,
        hasPreviousPage: page > 1,
      },
    });
  });

  api.get('/v1/opportunities/:id', async (request, response) => {
    if (!OPPORTUNITY_ID.test(request.params.id)) {
      sendError(response, request, 400, 'invalid_opportunity_id', 'The opportunity ID must be a 64-character hexadecimal ID.');
      return;
    }

    const opportunity = await repository.getPublicById(request.params.id);
    if (!opportunity) {
      sendError(response, request, 404, 'opportunity_not_found', 'The opportunity was not found.');
      return;
    }
    response.status(200).json({ data: opportunity });
  });

  app.use('/api', apiLimiter, api);
  app.use((request, response) => {
    sendError(response, request, 404, 'not_found', 'The requested resource was not found.');
  });
  app.use((error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }
    const isBlockedOrigin = error?.code === 'origin_not_allowed';
    const status = isBlockedOrigin ? 403 : 500;
    logger.error({
      event: 'http_error',
      requestId: request.requestId,
      status,
      errorCode: isBlockedOrigin ? 'origin_not_allowed' : 'internal_error',
      errorType: error?.name ?? 'Error',
    });
    sendError(
      response,
      request,
      status,
      isBlockedOrigin ? 'origin_not_allowed' : 'internal_error',
      isBlockedOrigin ? 'This origin is not allowed.' : 'An unexpected error occurred.',
    );
  });

  return app;
}
