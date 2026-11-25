export const consoleLogger = Object.freeze({
  info(record) {
    console.log(JSON.stringify(record));
  },
  error(record) {
    console.error(JSON.stringify(record));
  },
});

export function requestLoggerMiddleware(logger = consoleLogger) {
  return (request, response, next) => {
    const startedAt = process.hrtime.bigint();
    response.on('finish', () => {
      const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logger.info({
        event: 'http_request',
        requestId: request.requestId,
        method: request.method,
        path: request.originalUrl.split('?')[0],
        status: response.statusCode,
        durationMs: Math.round(elapsedMs * 100) / 100,
      });
    });
    next();
  };
}
