const pending = new Map<string, Promise<unknown>>();

/** Share simultaneous reads (including StrictMode replay), never cache observations. */
export function pendingRead<T>(url: string, read: () => Promise<T>): Promise<T> {
  const existing = pending.get(url);
  if (existing) return existing as Promise<T>;
  const request = Promise.resolve().then(read).finally(() => {
    if (pending.get(url) === request) pending.delete(url);
  });
  pending.set(url, request);
  return request;
}
