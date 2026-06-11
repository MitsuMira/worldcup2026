import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${id}`,
    { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 0 } },
  )
  if (!res.ok) return NextResponse.json({ error: `ESPN ${res.status}` }, { status: res.status })
  const data = await res.json()
  return NextResponse.json(data)
}
