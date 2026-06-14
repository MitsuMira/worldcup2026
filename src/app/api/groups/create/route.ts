import { NextResponse } from 'next/server'
import { kv, groupKey, memberKey, membersSetKey, type KvGroup, type KvMember } from '@/lib/kv'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.json() as { code: string; label: string; userId: string; name: string; predictions: Record<string, unknown> }
  const { code, label, userId, name, predictions } = body

  if (!code || !label || !userId || !name) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  }

  const group: KvGroup = { label, createdAt: new Date().toISOString() }
  const member: KvMember = { userId, name, predictions, updatedAt: new Date().toISOString() }

  await Promise.all([
    kv.set(groupKey(code), group),
    kv.set(memberKey(code, userId), member),
    kv.sadd(membersSetKey(code), userId),
  ])

  return NextResponse.json({ ok: true })
}
