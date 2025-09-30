'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface ImageFile {
  file: File
  preview: string
  id: string
}

export function ImageUploadScreen() {
  const router = useRouter()
  const [selectedImages, setSelectedImages] = useState<ImageFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    )
    
    if (files.length === 0) {
      toast.error('画像ファイルを選択してください')
      return
    }
    
    addImages(files)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(file => 
      file.type.startsWith('image/')
    )
    
    if (files.length === 0) {
      toast.error('画像ファイルを選択してください')
      return
    }
    
    addImages(files)
  }, [])

  const addImages = (files: File[]) => {
    const newImages: ImageFile[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9)
    }))
    
    setSelectedImages(prev => [...prev, ...newImages])
    toast.success(`${files.length}枚の画像を追加しました`)
  }

  const removeImage = (id: string) => {
    setSelectedImages(prev => {
      const image = prev.find(img => img.id === id)
      if (image) {
        URL.revokeObjectURL(image.preview)
      }
      return prev.filter(img => img.id !== id)
    })
  }

  const handleUpload = async () => {
    if (selectedImages.length === 0) {
      toast.error('アップロードする画像を選択してください')
      return
    }

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      selectedImages.forEach((imageFile, index) => {
        formData.append(`images`, imageFile.file)
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/images/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('画像のアップロードが完了しました')
        // 画像編集画面に遷移
        router.push(`/edit/${data.data.albumId}`)
      } else {
        throw new Error('アップロードに失敗しました')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('アップロードに失敗しました')
    } finally {
      setIsUploading(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            戻る
          </button>
          
          <button
            onClick={handleUpload}
            disabled={selectedImages.length === 0 || isUploading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'アップロード中...' : 'アップロード'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* ドラッグ&ドロップエリア */}
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragOver 
              ? 'border-primary-500 bg-primary-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            
            <div>
              <p className="text-xl font-medium text-gray-900 mb-2">
                ここに画像をドラッグ＆ドロップ
              </p>
              <p className="text-gray-500 mb-4">または</p>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary"
              >
                ファイルを選択する
              </button>
            </div>
            
            <p className="text-sm text-gray-500">
              JPG、PNG、GIF形式の画像ファイルをサポートしています
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* 選択した画像のプレビュー一覧 */}
        {selectedImages.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              選択した画像 ({selectedImages.length}枚)
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {selectedImages.map((image) => (
                <div key={image.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={image.preview}
                      alt={image.file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <button
                    onClick={() => removeImage(image.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  
                  <p className="text-xs text-gray-600 mt-1 truncate" title={image.file.name}>
                    {image.file.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
