/**
 * The single HTTP entry point.
 *
 * The Flutter app has no shared client -- every service re-implements the same header
 * block and threads the ID token through by hand -- so this is deliberately the one
 * place that knows about auth, timeouts and error shapes.
 */

import { API_URL } from './config';
import { buildQuery, extractMessage, type QueryValue } from './query';

export { buildQuery, type QueryValue };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The caller is signed in but lacks the admin claim, or is not signed in at all. */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Supplied by the auth layer. A function rather than a value because Firebase ID tokens
 * expire hourly and the SDK refreshes them on demand -- caching one here would start
 * returning 401s after an hour on a screen left open.
 */
let tokenProvider: (() => Promise<string | null>) | null = null;
let onUnauthorized: (() => void) | null = null;

export function configureApi(options: {
  getToken: () => Promise<string | null>;
  onUnauthorized?: () => void;
}) {
  tokenProvider = options.getToken;
  onUnauthorized = options.onUnauthorized ?? null;
}

export async function request<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;

  const token = tokenProvider ? await tokenProvider() : null;
  const headers = new Headers(rest.headers);
  headers.set('Accept', 'application/json');
  if (rest.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  // An admin aggregate against a cold database can be slow; a hung request that never
  // settles is worse than a clear timeout.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('The request timed out.', 0);
    }
    // Also where a CORS rejection lands: the browser reports it as a network failure.
    throw new ApiError('Could not reach the server.', 0);
  }
  clearTimeout(timer);

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) onUnauthorized?.();
    throw new ApiError(extractMessage(body, response.status), response.status, body);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
