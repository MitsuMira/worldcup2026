'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import PartySocket from 'partysocket'
import type { PartyRoomState, PartyClientMessage, PartyServerMessage, PartyPrediction } from '@/lib/partyTypes'
import { PARTY_HOST } from '@/lib/partyTypes'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export function usePartyGroup(
  code: string | null,
  userId: string,
  name: string,
  predictions: Record<string, PartyPrediction>,
) {
  const [state, setState] = useState<PartyRoomState | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const socketRef = useRef<PartySocket | null>(null)
  const predictionsRef = useRef(predictions)
  const nameRef = useRef(name)

  // keep refs current without reconnecting
  useEffect(() => { predictionsRef.current = predictions }, [predictions])
  useEffect(() => { nameRef.current = name }, [name])

  const send = useCallback((msg: PartyClientMessage) => {
    socketRef.current?.send(JSON.stringify(msg))
  }, [])

  // Sync updated predictions to server
  useEffect(() => {
    if (status !== 'connected' || !userId) return
    send({ type: 'predictions', userId, predictions })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictions, status, userId])

  // Connect / disconnect when code changes
  useEffect(() => {
    if (!code || !userId) return

    setStatus('connecting')
    const socket = new PartySocket({ host: PARTY_HOST, room: code })
    socketRef.current = socket

    socket.addEventListener('open', () => {
      setStatus('connected')
      socket.send(JSON.stringify({
        type: 'join',
        userId,
        name: nameRef.current,
        predictions: predictionsRef.current,
      } satisfies PartyClientMessage))
    })

    socket.addEventListener('message', (ev: MessageEvent) => {
      const msg = JSON.parse(ev.data as string) as PartyServerMessage
      if (msg.type === 'state') setState(msg.state)
    })

    socket.addEventListener('close', () => setStatus('disconnected'))
    socket.addEventListener('error', () => setStatus('disconnected'))

    return () => {
      socket.close()
      socketRef.current = null
      setStatus('disconnected')
    }
  }, [code, userId])

  const rename = useCallback((newName: string) => {
    if (!userId) return
    send({ type: 'rename', userId, name: newName })
  }, [userId, send])

  return { state, status, rename }
}
