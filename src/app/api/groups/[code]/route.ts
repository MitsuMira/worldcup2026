import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Check if a group exists
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const { data, error } = await supabase
    .from('groups')
    .select('code, label')
    .eq('code', code)
    .single()

  if (error || !data) return NextResponse.json({ exists: false })
  return NextResponse.json({ exists: true, label: data.label })
}

// Upsert a member's predictions into a group
export async function PUT(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const body = await req.json() as { userId: string; name: string; predictions: Record<string, unknown> }
  const { userId, name, predictions } = body

  if (!userId || !name) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

  const { error } = await supabase.from('group_members').upsert({
    code,
    user_id: userId,
    name,
    predictions,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'code,user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Get all members of a group
export async function POST(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const { data, error } = await supabase
    .from('group_members')
    .select('user_id, name, predictions, updated_at')
    .eq('code', code)
    .order('updated_at', { ascending: true })

  if (error) return NextResponse.json({ members: [] })
  return NextResponse.json({ members: data ?? [] })
}
