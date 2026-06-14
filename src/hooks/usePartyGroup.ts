'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import PartySocket from 'partysocket'
import type { PartyRoomState, PartyClientMessage, PartyServerMessage, PartyPrediction } from '@/lib/partyTypes'
import { PARTY_HOST } from '@/lib/partyTypes'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface ConnectionLog {
  ts: string
  msg: string
  type: 'info' | 'ok' | 'error'
}

function log(logs: ConnectionLog[], msg: string, type: ConnectionLog['type'] = 'info'): ConnectionLog[] {
  const ts = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return [...logs.slice(-19), { ts, msg, type }]
}

export function usePartyGroup(
  code: string | null,
  userId: string,
  name: string,
  predictions: Record<string, PartyPrediction>,
) {
  const [state, setState] = useState<PartyRoomState | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [logs, setLogs] = useState<ConnectionLog[]>([])
  const socketRef = useRef<PartySocket | null>(null)
  const predictionsRef = useRef(predictions)
  const nameRef = useRef(name)

  const addLog = useCallback((msg: string, type: ConnectionLog['type'] = 'info') => {
    setLogs(prev => log(prev, msg, type))
  }, [])

  useEffect(() => { predictionsRef.current = predictions }, [predictions])
  useEffect(() => { nameRef.current = name }, [name])

  const send = useCallback((msg: PartyClientMessage) => {
    socketRef.current?.send(JSON.stringify(msg))
  }, [])

  useEffect(() => {
    if (status !== 'connected' || !userId) return
    send({ type: 'predictions', userId, predictions })
    addLog(`Palpites sincronizados (${Object.keys(predictions).length})`, 'info')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictions, status, userId])

  useEffect(() => {
    if (!code || !userId) {
      addLog(`Aguardando: code=${code ?? 'null'} userId=${userId || 'null'}`, 'info')
      return
    }

    if (!PARTY_HOST) {
      addLog('ERRO: NEXT_PUBLIC_PARTYKIT_HOST não configurado', 'error')
      return
    }

    addLog(`Conectando → ws://${PARTY_HOST}/parties/main/${code}`, 'info')
    setStatus('connecting')

    const socket = new PartySocket({ host: PARTY_HOST, room: code })
    socketRef.current = socket

    socket.addEventListener('open', () => {
      setStatus('connected')
      addLog('WebSocket aberto', 'ok')
      const joinMsg: PartyClientMessage = {
        type: 'join',
        userId,
        name: nameRef.current,
        predictions: predictionsRef.current,
      }
      socket.send(JSON.stringify(joinMsg))
      addLog(`Enviado: join (nome="${nameRef.current}", ${Object.keys(predictionsRef.current).length} palpites)`, 'ok')
    })

    socket.addEventListener('message', (ev: MessageEvent) => {
      try {
        const msg = JSON.parse(ev.data as string) as PartyServerMessage
        if (msg.type === 'state') {
          setState(msg.state)
          addLog(`Estado recebido: ${Object.keys(msg.state.members).length} membro(s)`, 'ok')
        } else {
          addLog(`Mensagem desconhecida: ${ev.data as string}`, 'info')
        }
      } catch {
        addLog(`Erro ao parsear mensagem: ${ev.data as string}`, 'error')
      }
    })

    socket.addEventListener('close', (ev) => {
      setStatus('disconnected')
      const ce = ev as unknown as CloseEvent
      addLog(`Conexão fechada (code=${ce?.code ?? '?'} reason=${ce?.reason || 'sem motivo'})`, 'error')
    })

    socket.addEventListener('error', (ev) => {
      setStatus('disconnected')
      const ee = ev as unknown as ErrorEvent
      addLog(`Erro WebSocket: ${ee?.message ?? JSON.stringify(ev)}`, 'error')
    })

    return () => {
      addLog('Desconectando (cleanup)', 'info')
      socket.close()
      socketRef.current = null
      setStatus('disconnected')
    }
  }, [code, userId, addLog])

  const rename = useCallback((newName: string) => {
    if (!userId) return
    send({ type: 'rename', userId, name: newName })
  }, [userId, send])

  return { state, status, logs, rename }
}
