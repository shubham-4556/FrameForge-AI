export function cancelKey(kind: 'render' | 'ai', id: string): string {
  return `ff:cancel:${kind}:${id}`;
}

interface RedisGetter {
  get(key: string): Promise<string | null>;
}

export async function isCanceled(
  redis: RedisGetter,
  kind: 'render' | 'ai',
  id: string,
): Promise<boolean> {
  const value = await redis.get(cancelKey(kind, id));
  return value === '1';
}
