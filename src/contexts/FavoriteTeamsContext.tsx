'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const STORAGE_KEY = 'wc2026_favorites'

interface FavoritesContextValue {
  favorites: string[]
  toggleFavorite: (teamId: string) => void
  isFavorite: (teamId: string) => boolean
}

const FavoritesContext = createContext<FavoritesContextValue>({
  favorites: [],
  toggleFavorite: () => {},
  isFavorite: () => false,
})

export function FavoriteTeamsProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
      if (Array.isArray(stored)) setFavorites(stored)
    } catch {}
  }, [])

  const toggleFavorite = (teamId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const isFavorite = (teamId: string) => favorites.includes(teamId)

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  return useContext(FavoritesContext)
}
