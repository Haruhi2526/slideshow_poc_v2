'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { AlbumCard } from './AlbumCard'
import toast from 'react-hot-toast'

interface Album {
  id: number
  name: string
  description: string
  created_at: string
  updated_at: string
}

export function AlbumList() {
  const { token } = useAuth()
  const [albums, setAlbums] = useState<Album[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetchAlbums()
    }
  }, [token])

  const fetchAlbums = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/albums`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAlbums(data.data.albums)
      } else {
        toast.error('アルバムの取得に失敗しました')
      }
    } catch (error) {
      console.error('Failed to fetch albums:', error)
      toast.error('アルバムの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAlbumCreated = (newAlbum: Album) => {
    setAlbums(prev => [newAlbum, ...prev])
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (albums.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">アルバムがありません</h3>
        <p className="text-gray-500">最初のアルバムを作成して、写真をアップロードしましょう。</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {albums.map((album) => (
        <AlbumCard
          key={album.id}
          album={album}
          onUpdate={fetchAlbums}
        />
      ))}
    </div>
  )
}

