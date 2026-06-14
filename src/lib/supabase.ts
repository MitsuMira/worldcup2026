import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(url, key)

export interface DbGroup {
  code: string
  label: string
  created_at: string
}

export interface DbGroupMember {
  code: string
  user_id: string
  name: string
  predictions: Record<string, unknown>
  updated_at: string
}
