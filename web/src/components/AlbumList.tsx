'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { AlbumCard } from './AlbumCard'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Album {
  id: number
  name: string
  description: string
  created_at: string
  updated_at: string
  thumbnail_url?: string
  image_count?: number
}

interface Slideshow {
  id: number
  album_id: number
  video_url?: string
  thumbnail_url?: string
  status: 'processing' | 'completed' | 'failed'
  created_at: string
}

export function AlbumList() {
  const { token } = useAuth()
  const router = useRouter()
  const [albums, setAlbums] = useState<Album[]>([])
  const [slideshows, setSlideshows] = useState<Slideshow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetchAlbums()
      fetchSlideshows()
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
        // 各アルバムの画像情報を取得
        const albumsWithImages = await Promise.all(
          data.data.albums.map(async (album: Album) => {
            try {
              const imagesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/images/album/${album.id}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              })
              
              if (imagesResponse.ok) {
                const imagesData = await imagesResponse.json()
                const images = imagesData.data.images || []
                return {
                  ...album,
                  image_count: images.length,
                  thumbnail_url: images.length > 0 ? images[0].url : undefined
                }
              }
              return album
            } catch (error) {
              console.error(`Failed to fetch images for album ${album.id}:`, error)
              return album
            }
          })
        )
        setAlbums(albumsWithImages)
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

  const fetchSlideshows = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/slideshows`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSlideshows(data.data.slideshows)
      }
    } catch (error) {
      console.error('Failed to fetch slideshows:', error)
    }
  }

  const handleAlbumClick = (albumId: number) => {
    router.push(`/edit/${albumId}`)
  }

  const handleSlideshowClick = (slideshowId: number) => {
    // 動画再生画面への遷移（今回は設計対象外）
    toast.info('動画再生機能は今後実装予定です')
  }

  const handleUploadClick = () => {
    router.push('/upload')
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

  if (albums.length === 0 && slideshows.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">画像をアップロードして、最初のアルバムを作成しましょう。</h3>
        <p className="text-gray-500 mb-6">思い出の写真をスライドショーにしましょう。</p>
        <button
          onClick={handleUploadClick}
          className="btn-primary"
        >
          画像をアップロード
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* アルバムとスライドショーのグリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* アルバム */}
        {albums.map((album) => (
          <div
            key={`album-${album.id}`}
            onClick={() => handleAlbumClick(album.id)}
            className="card cursor-pointer hover:shadow-lg transition-shadow duration-200"
          >
            <div className="aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden">
              {album.thumbnail_url ? (
                <img
                  src={album.thumbnail_url}
                  alt={album.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            
            <div className="text-center">
              <h3 className="font-medium text-gray-900 mb-1">{album.name}</h3>
              <p className="text-sm text-gray-500">
                {album.image_count || 0}枚の画像
              </p>
            </div>
          </div>
        ))}

        {/* スライドショー */}
        {slideshows.map((slideshow) => (
          <div
            key={`slideshow-${slideshow.id}`}
            onClick={() => handleSlideshowClick(slideshow.id)}
            className="card cursor-pointer hover:shadow-lg transition-shadow duration-200 relative"
          >
            <div className="aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden relative">
              {slideshow.thumbnail_url ? (
                <img
                  src={slideshow.thumbnail_url}
                  alt="スライドショー"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
              
              {/* 再生ボタンオーバーレイ */}
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
              
              {/* ステータスバッジ */}
              {slideshow.status === 'processing' && (
                <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                  生成中
                </div>
              )}
            </div>
            
            <div className="text-center">
              <h3 className="font-medium text-gray-900 mb-1">スライドショー</h3>
              <p className="text-sm text-gray-500">
                {slideshow.status === 'completed' ? '完成' : 
                 slideshow.status === 'processing' ? '生成中...' : 'エラー'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 画像をアップロードボタン */}
      <div className="text-center">
        <button
          onClick={handleUploadClick}
          className="btn-primary text-lg px-8 py-4"
        >
          画像をアップロード
        </button>
      </div>
    </div>
  )
}

