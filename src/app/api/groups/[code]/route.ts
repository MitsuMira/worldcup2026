import { NextResponse } from 'next/server'
import { kv, groupKey, memberKey, membersSetKey, type KvGroup, type KvMember } from '@/lib/kv'

export const dynamic = 'force-dynamic'

// Check if a group exists
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const group = await kv.get<KvGroup>(groupKey(code))
  if (!group) return NextResponse.json({ exists: false })
  return NextResponse.json({ exists: true, label: group.label })
}

// Upsert a member's predictions — also restores group key if Redis was wiped
export async function PUT(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const body = await req.json() as { userId: string; name: string; predictions: Record<string, unknown>; groupLabel?: string }
  const { userId, name, predictions, groupLabel } = body

  if (!userId || !name) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

  const member: KvMember = { userId, name, predictions, updatedAt: new Date().toISOString() }
  const ops: Promise<unknown>[] = [
    kv.set(memberKey(code, userId), member),
    kv.sadd(membersSetKey(code), userId),
  ]

  // If group key is missing (Redis restart), recreate it from the client's local label
  if (groupLabel) {
    const existing = await kv.get<KvGroup>(groupKey(code))
    if (!existing) {
      ops.push(kv.set(groupKey(code), { label: groupLabel, createdAt: new Date().toISOString() } satisfies KvGroup))
    }
  }

  await Promise.all(ops)
  return NextResponse.json({ ok: true })
}

// Get all members of a group
export async function POST(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const userIds = await kv.smembers<string[]>(membersSetKey(code))
  if (!userIds || userIds.length === 0) return NextResponse.json({ members: [] })

  const members = await Promise.all(
    userIds.map(uid => kv.get<KvMember>(memberKey(code, uid)))
  )

  return NextResponse.json({ members: members.filter(Boolean) })
}
