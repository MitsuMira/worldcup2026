import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.json() as { code: string; label: string; userId: string; name: string; predictions: Record<string, unknown> }
  const { code, label, userId, name, predictions } = body

  if (!code || !label || !userId || !name) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  }

  // Create group
  const { error: groupError } = await supabase
    .from('groups')
    .insert({ code, label })

  if (groupError) {
    // If duplicate code, it's a collision — caller should retry with a new code
    return NextResponse.json({ error: groupError.message }, { status: 500 })
  }

  // Add creator as first member
  const { error: memberError } = await supabase
    .from('group_members')
    .insert({ code, user_id: userId, name, predictions, updated_at: new Date().toISOString() })

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
