import { NextResponse } from 'next/server'
import { kv, groupKey, memberKey, membersSetKey, type KvGroup, type KvMember } from '@/lib/kv'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  try {
    const group = await kv.get<KvGroup>(groupKey(code))
    if (!group) return NextResponse.json({ exists: false })
    return NextResponse.json({
      exists: true,
      label: group.label,
      creatorId: group.creatorId ?? null,
      minParticipation: group.minParticipation ?? 0,
    })
  } catch (e) {
    console.error('[groups GET]', e)
    return NextResponse.json({ exists: false, error: String(e) })
  }
}

// PATCH: claim ownership (if unclaimed) or update settings (creator only)
export async function PATCH(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  try {
    const body = await req.json() as { userId: string; action: 'claim' | 'settings' | 'transfer'; minParticipation?: number; targetId?: string }
    const { userId, action } = body

    if (!userId || !action) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

    const group = await kv.get<KvGroup>(groupKey(code))
    if (!group) return NextResponse.json({ error: 'group not found' }, { status: 404 })

    if (action === 'claim') {
      if (group.creatorId) return NextResponse.json({ error: 'already claimed' }, { status: 409 })
      await kv.set(groupKey(code), { ...group, creatorId: userId })
      return NextResponse.json({ ok: true, creatorId: userId })
    }

    if (action === 'transfer') {
      if (!group.creatorId || group.creatorId !== userId)
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      const targetId = body.targetId
      if (!targetId) return NextResponse.json({ error: 'missing targetId' }, { status: 400 })
      // Verify target is a member
      const members = await kv.smembers(membersSetKey(code))
      if (!members.includes(targetId))
        return NextResponse.json({ error: 'target not a member' }, { status: 400 })
      await kv.set(groupKey(code), { ...group, creatorId: targetId })
      return NextResponse.json({ ok: true, creatorId: targetId })
    }

    if (action === 'settings') {
      if (group.creatorId && group.creatorId !== userId)
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      const minParticipation = Number(body.minParticipation ?? 0)
      if (![0, 50, 100].includes(minParticipation))
        return NextResponse.json({ error: 'invalid minParticipation' }, { status: 400 })
      await kv.set(groupKey(code), { ...group, minParticipation })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[groups PATCH]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
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
        ops.push(kv.set(groupKey(code), { label: groupLabel, createdAt: new Date().toISOString(), minParticipation: 0 } satisfies KvGroup))
      }
    }

    await Promise.all(ops)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[groups PUT]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// Remove a member from the group (leave or admin kick)
export async function DELETE(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  try {
    const body = await req.json() as { userId: string; adminId?: string }
    const { userId, adminId } = body
    if (!userId) return NextResponse.json({ error: 'missing userId' }, { status: 400 })

    // If adminId is provided, verify they are the group creator
    if (adminId && adminId !== userId) {
      const group = await kv.get<KvGroup>(groupKey(code))
      if (!group || group.creatorId !== adminId)
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

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
