const UID_KEY = 'wc2026_uid'
const NAME_KEY = 'wc2026_name'
const GROUPS_KEY = 'wc2026_groups'

export interface GroupEntry {
  code: string
  label: string   // user-given name for the group
  joinedAt: string
}

export function getOrCreateUserId(): string {
  try {
    const existing = localStorage.getItem(UID_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(UID_KEY, id)
    return id
  } catch { return 'anon' }
}

export function getUserName(): string {
  try { return localStorage.getItem(NAME_KEY) ?? '' } catch { return '' }
}

export function setUserName(name: string) {
  try { localStorage.setItem(NAME_KEY, name) } catch {}
}

export function getGroups(): GroupEntry[] {
  try { return JSON.parse(localStorage.getItem(GROUPS_KEY) ?? '[]') } catch { return [] }
}

export function saveGroup(entry: GroupEntry) {
  const groups = getGroups().filter(g => g.code !== entry.code)
  groups.unshift(entry)
  try { localStorage.setItem(GROUPS_KEY, JSON.stringify(groups)) } catch {}
}

export function removeGroup(code: string) {
  const groups = getGroups().filter(g => g.code !== code)
  try { localStorage.setItem(GROUPS_KEY, JSON.stringify(groups)) } catch {}
}

export function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
