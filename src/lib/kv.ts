import Redis from 'ioredis'

// Reuse connection across serverless invocations (warm instances)
const globalForRedis = globalThis as unknown as { redis?: Redis }

function getRedis(): Redis {
  if (!globalForRedis.redis) {
    const url = process.env.REDIS_URL
    if (!url) throw new Error('Missing REDIS_URL environment variable')
    globalForRedis.redis = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 3 })
  }
  return globalForRedis.redis
}

export const kv = {
  async get<T>(key: string): Promise<T | null> {
    const val = await getRedis().get(key)
    return val ? (JSON.parse(val) as T) : null
  },
  async set(key: string, value: unknown): Promise<void> {
    await getRedis().set(key, JSON.stringify(value))
  },
  async del(key: string): Promise<void> {
    await getRedis().del(key)
  },
  async sadd(key: string, ...members: string[]): Promise<void> {
    await getRedis().sadd(key, ...members)
  },
  async srem(key: string, ...members: string[]): Promise<void> {
    await getRedis().srem(key, ...members)
  },
  async smembers(key: string): Promise<string[]> {
    return getRedis().smembers(key)
  },
}

export interface KvGroup {
  label: string
  createdAt: string
}

export interface KvMember {
  userId: string
  name: string
  predictions: Record<string, unknown>
  updatedAt: string
}

export const groupKey = (code: string) => `group:${code}`
export const memberKey = (code: string, userId: string) => `group:${code}:member:${userId}`
export const membersSetKey = (code: string) => `group:${code}:members`
