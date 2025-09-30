'use client'

import { useState } from 'react'
import { useAuth } from './AuthProvider'
import toast from 'react-hot-toast'

interface Album {
  id: number
  name: string
  description: string
  created_at: string
  updated_at: string
}

interface AlbumCardProps {
  album: Album
  onUpdate: () => void
}

export function AlbumCard({ album, onUpdate }: AlbumCardProps) {
  const { token } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('このアルバムを削除しますか？')) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/albums/${album.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        toast.success('アルバムを削除しました')
        onUpdate()
      } else {
        toast.error('アルバムの削除に失敗しました')
      }
    } catch (error) {
      console.error('Failed to delete album:', error)
      toast.error('アルバムの削除に失敗しました')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="card hover:shadow-lg transition-shadow duration-200">
      <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg mb-4 flex items-center justify-center">
        <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{album.name}</h3>
        {album.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{album.description}</p>
        )}
        <p className="text-xs text-gray-500 mb-4">
          作成日: {new Date(album.created_at).toLocaleDateString('ja-JP')}
        </p>
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={() => window.location.href = `/albums/${album.id}`}
          className="flex-1 btn-primary text-sm"
        >
          開く
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="btn-secondary text-sm px-3"
        >
          {isDeleting ? (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            '削除'
          )}
        </button>
      </div>
    </div>
  )
}

