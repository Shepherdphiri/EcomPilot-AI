import * as Sentry from '@sentry/node';
import { Express } from 'express';

export function initSentry(app: Express) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.RAILWAY_GIT_COMMIT_SHA || 'local',
    tracesSampleRate: 0.2,
  });

  Sentry.setupExpressErrorHandler(app);
}

export function captureOperationException(
  err: unknown,
  context: { workspaceId?: string; service: string; metadata?: Record<string, unknown> }
) {
  Sentry.withScope((scope) => {
    if (context.workspaceId) scope.setTag('workspace_id', context.workspaceId);
    scope.setTag('service', context.service);
    if (context.metadata) scope.setContext('operation', context.metadata);
    Sentry.captureException(err);
  });
}
