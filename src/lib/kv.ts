import { kv } from '@vercel/kv'

export { kv }

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
