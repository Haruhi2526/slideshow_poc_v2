'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuth } from './AuthProvider'

interface Slideshow {
  id: number
  album_id: number
  filename: string
  file_path: string
  file_size: number
  duration: number
  status: 'processing' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

interface Album {
  id: number
  name: string
}

interface SlideshowListProps {
  albumId: string
}

export function SlideshowList({ albumId }: SlideshowListProps) {
  const router = useRouter()
  const { token } = useAuth()
  const [slideshows, setSlideshows] = useState<Slideshow[]>([])
  const [album, setAlbum] = useState<Album | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSlideshows = useCallback(async () => {
    if (!token) {
      console.log('No token available, skipping slideshow fetch')
      return
    }
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/slideshows/album/${albumId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSlideshows(data.data.slideshows)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('API Error:', errorData)
        const errorMessage = `スライドショーの取得に失敗しました: ${errorData.error?.message || response.statusText}`
        toast.error(errorMessage)
        return
      }
    } catch (error) {
      console.error('Fetch slideshows error:', error)
      if (!(error instanceof Error && error.message.includes('スライドショーの取得に失敗しました'))) {
        toast.error('スライドショーの取得に失敗しました')
      }
    }
  }, [albumId, token])

  const fetchAlbum = useCallback(async () => {
    if (!token) {
      console.log('No token available, skipping album fetch')
      return
    }
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/albums/${albumId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAlbum(data.data.album)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('API Error:', errorData)
        const errorMessage = `アルバムの取得に失敗しました: ${errorData.error?.message || response.statusText}`
        toast.error(errorMessage)
        return
      }
    } catch (error) {
      console.error('Fetch album error:', error)
      if (!(error instanceof Error && error.message.includes('アルバムの取得に失敗しました'))) {
        toast.error('アルバムの取得に失敗しました')
      }
    }
  }, [albumId, token])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchAlbum(), fetchSlideshows()])
      setIsLoading(false)
    }
    
    loadData()
  }, [fetchAlbum, fetchSlideshows])

  const deleteSlideshow = async (slideshowId: number) => {
    if (!confirm('このスライドショーを削除しますか？')) {
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/slideshows/${slideshowId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        toast.success('スライドショーを削除しました')
        fetchSlideshows() // 一覧を再取得
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || 'スライドショーの削除に失敗しました')
      }
    } catch (error) {
      console.error('Delete slideshow error:', error)
      toast.error(error instanceof Error ? error.message : 'スライドショーの削除に失敗しました')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">完了</span>
      case 'processing':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">処理中</span>
      case 'failed':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">失敗</span>
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">不明</span>
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {album ? album.name : 'アルバム'} のスライドショー
          </h2>
          <p className="text-gray-600 mt-1">
            {slideshows.length} 個のスライドショー
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => router.push(`/slideshow/create/${albumId}`)}
            className="btn-primary"
          >
            新しいスライドショーを作成
          </button>
          <button
            onClick={() => router.back()}
            className="btn-secondary"
          >
            戻る
          </button>
        </div>
      </div>

      {/* スライドショー一覧 */}
      {slideshows.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">スライドショーがありません</h3>
          <p className="text-gray-600 mb-6">このアルバムのスライドショーを作成しましょう。</p>
          <button
            onClick={() => router.push(`/slideshow/create/${albumId}`)}
            className="btn-primary"
          >
            スライドショーを作成
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {slideshows.map((slideshow) => (
            <div key={slideshow.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                {slideshow.status === 'completed' ? (
                  <video
                    src={`${process.env.NEXT_PUBLIC_API_URL}/${slideshow.file_path}`}
                    className="w-full h-full object-cover"
                    controls
                  />
                ) : (
                  <div className="text-center">
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-gray-500">
                      {slideshow.status === 'processing' ? '処理中...' : 'エラー'}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900 truncate">
                    {slideshow.filename}
                  </h3>
                  {getStatusBadge(slideshow.status)}
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <p>時間: {formatDuration(slideshow.duration)}</p>
                  <p>サイズ: {formatFileSize(slideshow.file_size)}</p>
                  <p>作成日: {new Date(slideshow.created_at).toLocaleDateString('ja-JP')}</p>
                </div>
                
                <div className="flex space-x-2 mt-4">
                  {slideshow.status === 'completed' && (
                    <button
                      onClick={() => {
                        const videoUrl = `${process.env.NEXT_PUBLIC_API_URL}/${slideshow.file_path}`
                        window.open(videoUrl, '_blank')
                      }}
                      className="flex-1 btn-primary text-sm py-2"
                    >
                      再生
                    </button>
                  )}
                  <button
                    onClick={() => deleteSlideshow(slideshow.id)}
                    className="flex-1 btn-secondary text-sm py-2"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
