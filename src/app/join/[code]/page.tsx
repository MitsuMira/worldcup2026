'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getOrCreateUserId, getUserName, setUserName, getGroups, saveGroup } from '@/lib/identity'
import { Loader2, Users } from 'lucide-react'

const STORAGE_KEY = 'wc2026_predictions'

export default function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const [step, setStep] = useState<'loading' | 'name' | 'joining' | 'error'>('loading')
  const [name, setName] = useState('')
  const [groupLabel, setGroupLabel] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    // Fetch group info to validate code and get label
    fetch(`/api/groups/${code}`)
      .then(r => r.json())
      .then((data: { exists: boolean; label?: string }) => {
        if (!data.exists) {
          setErrorMsg('Grupo não encontrado. Verifique o link e tente novamente.')
          setStep('error')
          return
        }
        setGroupLabel(data.label ?? code)
        const existingName = getUserName()
        if (existingName) {
          // Name already set — join directly
          joinGroup(existingName)
        } else {
          setStep('name')
        }
      })
      .catch(() => {
        setErrorMsg('Não foi possível conectar. Tente novamente.')
        setStep('error')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  async function joinGroup(userName: string) {
    setStep('joining')
    try {
      const userId = getOrCreateUserId()
      let predictions: Record<string, unknown> = {}
      try { predictions = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch {}

      const label = groupLabel || code
      const res = await fetch(`/api/groups/${code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name: userName, predictions, groupLabel: label }),
      })

      if (!res.ok) throw new Error('join failed')

      // Already a member of this group? Keep existing label, otherwise use server label.
      const existing = getGroups().find(g => g.code === code)
      saveGroup({ code, label: existing?.label ?? label, joinedAt: new Date().toISOString() })

      router.replace(`/groups/${code}`)
    } catch {
      setErrorMsg('Erro ao entrar no grupo. Tente novamente.')
      setStep('error')
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setUserName(trimmed)
    joinGroup(trimmed)
  }

  if (step === 'loading' || step === 'joining') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Loader2 size={32} className="animate-spin" />
          <p className="text-sm">{step === 'joining' ? 'Entrando no grupo…' : 'Verificando convite…'}</p>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-slate-900 border border-red-800 rounded-2xl p-8 text-center">
          <p className="text-red-400 font-semibold mb-2">Não foi possível entrar</p>
          <p className="text-slate-500 text-sm mb-6">{errorMsg}</p>
          <a href="/groups" className="text-amber-400 hover:text-amber-300 text-sm font-bold transition-colors">
            Ver meus grupos
          </a>
        </div>
      </div>
    )
  }

  // step === 'name'
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center">
            <Users size={28} className="text-amber-400" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-white mb-2">Convite para grupo</h1>
          <p className="text-slate-400 text-sm">
            Você foi convidado para o grupo{' '}
            <span className="text-white font-bold">{groupLabel}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Como você quer aparecer no grupo?
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Seu nome"
              maxLength={30}
              autoFocus
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm"
            />
            <p className="text-xs text-slate-600 mt-1.5">Será exibido para os outros membros do grupo.</p>
          </div>
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-black text-sm rounded-xl transition-colors"
          >
            Entrar no grupo
          </button>
        </form>
      </div>
    </div>
  )
}
