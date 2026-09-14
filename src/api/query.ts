/**
 * Pure request/response helpers.
 *
 * Separate from client.ts because that module imports expo-constants, which only
 * resolves inside a bundler -- keeping these here means they can be unit tested in
 * plain node, and they hold the fiddly logic worth testing.
 */

export type QueryValue = string | number | boolean | null | undefined;

export function buildQuery(params: Record<string, QueryValue | QueryValue[]>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    // Note the explicit comparisons: `false` and `0` are meaningful filter values
    // (provisioned=false is "needs setup", max_balance=0 is "out of tokens"), so a
    // falsy check here would silently drop what the operator asked for.
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null && item !== '') {
          search.append(key, String(item));
        }
      }
    } else {
      search.append(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * The backend speaks two error shapes: FastAPI's HTTPException produces
 * {"detail": ...} and its own BusinessException handler produces {"message": ...}.
 * Both are read here rather than normalised server-side, because the Flutter app
 * already depends on the current shapes.
 */
export function extractMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    for (const key of ['detail', 'message', 'error'] as const) {
      const value = record[key];
      if (typeof value === 'string' && value) return value;
      // FastAPI validation errors put a list of objects in `detail`.
      if (Array.isArray(value) && value.length > 0) {
        const first = value[0] as Record<string, unknown> | undefined;
        if (first && typeof first.msg === 'string') {
          const field = Array.isArray(first.loc) ? first.loc.at(-1) : undefined;
          return field ? `${String(field)}: ${first.msg}` : first.msg;
        }
      }
    }
  }
  if (status === 0) return 'Could not reach the server. Check your connection.';
  return `Request failed (${status}).`;
}
