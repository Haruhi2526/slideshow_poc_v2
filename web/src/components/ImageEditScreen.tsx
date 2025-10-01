'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuth } from './AuthProvider'

interface Image {
  id: string
  url: string
  filename: string
  rotation: number
}

interface ImageEditScreenProps {
  albumId: string
}

export function ImageEditScreen({ albumId }: ImageEditScreenProps) {
  const router = useRouter()
  const { token } = useAuth()
  const [images, setImages] = useState<Image[]>([])
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  const fetchImages = useCallback(async () => {
    if (!token) {
      console.log('No token available, skipping image fetch')
      setIsLoading(false)
      return
    }
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/albums/${albumId}/images`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Received image data:', data)
        console.log('Images array:', data.data.images)
        if (data.data.images.length > 0) {
          console.log('First image URL:', data.data.images[0].url)
        }
        setImages(data.data.images)
        if (data.data.images.length > 0) {
          setSelectedImageId(data.data.images[0].id)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('API Error:', errorData)
        const errorMessage = `画像の取得に失敗しました: ${errorData.error?.message || response.statusText}`
        toast.error(errorMessage)
        setIsLoading(false)
        return
      }
    } catch (error) {
      console.error('Fetch images error:', error)
      // ネットワークエラーなどの場合のみエラーメッセージを表示
      if (!(error instanceof Error && error.message.includes('画像の取得に失敗しました'))) {
        toast.error('画像の取得に失敗しました')
      }
    } finally {
      setIsLoading(false)
    }
  }, [albumId, token])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragItem.current = index
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    dragOverItem.current = index
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    
    if (dragItem.current === null || dragOverItem.current === null) return
    
    const newImages = [...images]
    const draggedItem = newImages[dragItem.current]
    
    // ドラッグしたアイテムを削除
    newImages.splice(dragItem.current, 1)
    // 新しい位置に挿入
    newImages.splice(dragOverItem.current, 0, draggedItem)
    
    setImages(newImages)
    
    dragItem.current = null
    dragOverItem.current = null
  }

  const rotateImage = async (imageId: string) => {
    const newImages = images.map(img => 
      img.id === imageId 
        ? { ...img, rotation: (img.rotation + 90) % 360 }
        : img
    )
    setImages(newImages)
  }

  const deleteImage = async (imageId: string) => {
    if (!confirm('この画像を削除しますか？')) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/images/${imageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const newImages = images.filter(img => img.id !== imageId)
        setImages(newImages)
        
        if (selectedImageId === imageId && newImages.length > 0) {
          setSelectedImageId(newImages[0].id)
        } else if (newImages.length === 0) {
          setSelectedImageId(null)
        }
        
        toast.success('画像を削除しました')
      } else {
        throw new Error('画像の削除に失敗しました')
      }
    } catch (error) {
      console.error('Delete image error:', error)
      toast.error('画像の削除に失敗しました')
    }
  }

  const saveChanges = async () => {
    setIsSaving(true)
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/albums/${albumId}/images/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          images: images.map((img, index) => ({
            id: img.id,
            order: index,
            rotation: img.rotation
          }))
        }),
      })

      if (response.ok) {
        toast.success('変更を保存しました')
      } else {
        throw new Error('保存に失敗しました')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const generateSlideshow = () => {
    if (images.length === 0) {
      toast.error('スライドショーを作成するには画像が必要です')
      return
    }
    
    setIsGenerating(true)
    router.push(`/slideshow/create/${albumId}`)
  }

  const handleBack = () => {
    if (images.length > 0) {
      if (!confirm('変更を保存せずに戻りますか？')) return
    }
    router.back()
  }

  const selectedImage = images.find(img => img.id === selectedImageId)
  
  // デバッグ用ログ
  console.log('Current images:', images)
  console.log('Selected image ID:', selectedImageId)
  console.log('Selected image:', selectedImage)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              戻る
            </button>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <div className="bg-white rounded-lg shadow-md p-12">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h2 className="text-xl font-medium text-gray-900 mb-2">画像がありません</h2>
            <p className="text-gray-600 mb-6">このアルバムには画像が含まれていません。</p>
            <button
              onClick={() => router.push('/upload')}
              className="btn-primary"
            >
              画像をアップロード
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            戻る
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={saveChanges}
              disabled={isSaving}
              className="btn-secondary disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
            
            <button
              onClick={generateSlideshow}
              disabled={isGenerating}
              className="btn-primary disabled:opacity-50"
            >
              {isGenerating ? '生成中...' : 'スライドショー作成'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* メイン画像プレビュー */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">選択中画像のプレビュー</h2>
              
              {selectedImage && (
                <div className="space-y-4">
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={selectedImage.url}
                      alt={selectedImage.filename}
                      className="w-full h-full object-contain"
                      style={{ transform: `rotate(${selectedImage.rotation}deg)` }}
                      onLoad={() => console.log('Image loaded successfully:', selectedImage.url)}
                      onError={(e) => console.error('Image load error:', selectedImage.url, e)}
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => rotateImage(selectedImage.id)}
                      className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      回転
                    </button>
                    
                    <button
                      onClick={() => deleteImage(selectedImage.id)}
                      className="flex items-center px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      削除
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 画像サムネイル一覧 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                画像一覧 ({images.length}枚)
              </h3>
              
              <div className="space-y-2">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDrop={handleDrop}
                    onClick={() => setSelectedImageId(image.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedImageId === image.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        <img
                          src={image.url}
                          alt={image.filename}
                          className="w-full h-full object-cover"
                          style={{ transform: `rotate(${image.rotation}deg)` }}
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {image.filename}
                        </p>
                        <p className="text-xs text-gray-500">
                          {index + 1}枚目
                        </p>
                      </div>
                      
                      <div className="flex-shrink-0">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-gray-500 mt-4">
                画像をドラッグ＆ドロップで順番を変更できます
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
