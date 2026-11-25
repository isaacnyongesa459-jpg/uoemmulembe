import { randomUUID } from 'node:crypto';

const SAFE_REQUEST_ID = /^[A-Za-z0-9_-]{1,64}$/u;

export function requestIdMiddleware(request, response, next) {
  const supplied = request.get('x-request-id');
  request.requestId = supplied && SAFE_REQUEST_ID.test(supplied) ? supplied : randomUUID();
  response.setHeader('X-Request-Id', request.requestId);
  next();
}
