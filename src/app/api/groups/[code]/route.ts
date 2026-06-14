import { NextResponse } from 'next/server'
import { kv, groupKey, memberKey, membersSetKey, type KvGroup, type KvMember } from '@/lib/kv'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  try {
    const group = await kv.get<KvGroup>(groupKey(code))
    if (!group) return NextResponse.json({ exists: false })
    return NextResponse.json({ exists: true, label: group.label })
  } catch (e) {
    console.error('[groups GET]', e)
    return NextResponse.json({ exists: false, error: String(e) })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  try {
    const body = await req.json() as { userId: string; name: string; predictions: Record<string, unknown>; groupLabel?: string }
    const { userId, name, predictions, groupLabel } = body

    if (!userId || !name) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

    const member: KvMember = { userId, name, predictions, updatedAt: new Date().toISOString() }
    const ops: Promise<unknown>[] = [
      kv.set(memberKey(code, userId), member),
      kv.sadd(membersSetKey(code), userId),
    ]

    if (groupLabel) {
      const existing = await kv.get<KvGroup>(groupKey(code))
      if (!existing) {
        ops.push(kv.set(groupKey(code), { label: groupLabel, createdAt: new Date().toISOString() } satisfies KvGroup))
      }
    }

    await Promise.all(ops)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[groups PUT]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// Remove a member from the group (leave)
export async function DELETE(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  try {
    const { userId } = await req.json() as { userId: string }
    if (!userId) return NextResponse.json({ error: 'missing userId' }, { status: 400 })
    await Promise.all([
      kv.del(memberKey(code, userId)),
      kv.srem(membersSetKey(code), userId),
    ])
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[groups DELETE]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  try {
    const userIds = await kv.smembers(membersSetKey(code))
    if (!userIds || userIds.length === 0) return NextResponse.json({ members: [] })

    const members = await Promise.all(
      userIds.map(uid => kv.get<KvMember>(memberKey(code, uid)))
    )
    return NextResponse.json({ members: members.filter(Boolean) })
  } catch (e) {
    console.error('[groups POST]', e)
    return NextResponse.json({ members: [], error: String(e) })
  }
}
