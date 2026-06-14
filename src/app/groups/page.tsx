'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, LogIn, Trash2, Copy, Check, Pencil } from 'lucide-react'
import { getOrCreateUserId, getUserName, setUserName, getGroups, saveGroup, removeGroup, generateCode, type GroupEntry } from '@/lib/identity'

export default function GroupsPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [userId, setUserId] = useState('')
  const [name, setName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [groups, setGroups] = useState<GroupEntry[]>([])
  const [joinCode, setJoinCode] = useState('')
  const [joinLabel, setJoinLabel] = useState('')
  const [createLabel, setCreateLabel] = useState('')
  const [view, setView] = useState<'list' | 'join' | 'create'>('list')
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setMounted(true)
    setUserId(getOrCreateUserId())
    const n = getUserName()
    setName(n)
    setNameInput(n)
    setGroups(getGroups())
  }, [])

  const saveName = () => {
    const trimmed = nameInput.trim()
    if (!trimmed) return
    setUserName(trimmed)
    setName(trimmed)
    setEditingName(false)
  }

  const handleCreate = () => {
    const label = createLabel.trim() || 'Meu grupo'
    const code = generateCode()
    const entry: GroupEntry = { code, label, joinedAt: new Date().toISOString() }
    saveGroup(entry)
    setGroups(getGroups())
    router.push(`/groups/${code}`)
  }

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (code.length !== 6) { setError('Código deve ter 6 caracteres'); return }
    const label = joinLabel.trim() || code
    const entry: GroupEntry = { code, label, joinedAt: new Date().toISOString() }
    saveGroup(entry)
    setGroups(getGroups())
    router.push(`/groups/${code}`)
  }

  const copy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const leave = (code: string) => {
    removeGroup(code)
    setGroups(getGroups())
  }

  if (!mounted) return null

  const needsName = !name

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Users size={28} className="text-amber-400" />
        <div>
          <h1 className="text-2xl font-black text-white">Grupos</h1>
          <p className="text-sm text-slate-400">Compita com amigos nos palpites</p>
        </div>
      </div>

      {/* User identity */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Seu nome</div>
        {editingName || needsName ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveName()}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
              placeholder="Como você quer ser chamado?"
              maxLength={24}
            />
            <button onClick={saveName} disabled={!nameInput.trim()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold text-sm rounded-lg transition-colors">
              Salvar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold">{name}</span>
            <button onClick={() => { setNameInput(name); setEditingName(true) }} className="text-slate-500 hover:text-slate-300">
              <Pencil size={13} />
            </button>
          </div>
        )}
      </div>

      {needsName && (
        <div className="text-center text-slate-500 text-sm py-8">Escolha um nome para criar ou entrar em grupos.</div>
      )}

      {!needsName && (
        <>
          {/* Actions */}
          {view === 'list' && (
            <div className="flex gap-2 mb-6">
              <button onClick={() => setView('create')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl transition-colors">
                <Plus size={16} /> Criar grupo
              </button>
              <button onClick={() => setView('join')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors border border-slate-700">
                <LogIn size={16} /> Entrar em grupo
              </button>
            </div>
          )}

          {view === 'create' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
              <h2 className="text-sm font-bold text-white mb-4">Criar novo grupo</h2>
              <div className="space-y-3">
                <input
                  autoFocus
                  value={createLabel}
                  onChange={e => setCreateLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                  placeholder="Nome do grupo (ex: Família, Trabalho)"
                  maxLength={32}
                />
                <div className="flex gap-2">
                  <button onClick={handleCreate}
                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm rounded-lg transition-colors">
                    Criar e entrar
                  </button>
                  <button onClick={() => setView('list')}
                    className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {view === 'join' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
              <h2 className="text-sm font-bold text-white mb-4">Entrar em um grupo</h2>
              {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
              <div className="space-y-3">
                <input
                  autoFocus
                  value={joinCode}
                  onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono tracking-widest focus:outline-none focus:border-amber-500 uppercase"
                  placeholder="CÓDIGO (6 letras)"
                  maxLength={6}
                />
                <input
                  value={joinLabel}
                  onChange={e => setJoinLabel(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-slate-600"
                  placeholder="Apelido para o grupo (opcional)"
                  maxLength={32}
                />
                <div className="flex gap-2">
                  <button onClick={handleJoin}
                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm rounded-lg transition-colors">
                    Entrar
                  </button>
                  <button onClick={() => { setView('list'); setError('') }}
                    className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Groups list */}
          {groups.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-10">
              Você ainda não está em nenhum grupo.<br />Crie um ou entre com um código!
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-3">Seus grupos</div>
              {groups.map(g => (
                <div key={g.code} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex items-center gap-3 transition-colors">
                  <button onClick={() => router.push(`/groups/${g.code}`)} className="flex-1 text-left">
                    <div className="text-white font-semibold">{g.label}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{g.code}</div>
                  </button>
                  <button onClick={() => copy(g.code)}
                    className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                    title="Copiar código">
                    {copied === g.code ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
                  </button>
                  <button onClick={() => leave(g.code)}
                    className="text-slate-600 hover:text-red-400 transition-colors p-1"
                    title="Sair do grupo">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-600 text-center mt-8">
            ID do usuário: <span className="font-mono">{userId.slice(0, 8)}…</span>
          </p>
        </>
      )}
    </div>
  )
}
