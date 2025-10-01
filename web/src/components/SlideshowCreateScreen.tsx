'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuth } from './AuthProvider'

interface Image {
  id: string
  url: string
  filename: string
}

interface SlideshowCreateScreenProps {
  albumId: string
}

export function SlideshowCreateScreen({ albumId }: SlideshowCreateScreenProps) {
  const router = useRouter()
  const { token } = useAuth()
  const [images, setImages] = useState<Image[]>([])
  const [bgm, setBgm] = useState('none')
  const [transition, setTransition] = useState('fade')
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0)
  const previewIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const bgmOptions = [
    { value: 'none', label: 'BGMなし' },
    { value: 'happy', label: '明るい' },
    { value: 'emotional', label: '感動系' },
    { value: 'calm', label: '落ち着いた' },
    { value: 'upbeat', label: 'アップテンポ' },
  ]

  const transitionOptions = [
    { value: 'fade', label: 'フェードイン/アウト' },
    { value: 'slide', label: 'スライド' },
    { value: 'zoom', label: 'ズーム' },
    { value: 'dissolve', label: 'ディゾルブ' },
  ]

  const fetchImages = useCallback(async () => {
    if (!token) {
      console.log('No token available, skipping image fetch')
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
        setImages(data.data.images)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('API Error:', errorData)
        const errorMessage = `画像の取得に失敗しました: ${errorData.error?.message || response.statusText}`
        toast.error(errorMessage)
        return
      }
    } catch (error) {
      console.error('Fetch images error:', error)
      // ネットワークエラーなどの場合のみエラーメッセージを表示
      if (!(error instanceof Error && error.message.includes('画像の取得に失敗しました'))) {
        toast.error('画像の取得に失敗しました')
      }
    }
  }, [albumId, token])

  useEffect(() => {
    fetchImages()
    return () => {
      if (previewIntervalRef.current) {
        clearInterval(previewIntervalRef.current)
      }
    }
  }, [fetchImages])

  const startPreview = () => {
    if (images.length <= 1) return

    previewIntervalRef.current = setInterval(() => {
      setCurrentPreviewIndex(prev => (prev + 1) % images.length)
    }, 2000)
  }

  const stopPreview = () => {
    if (previewIntervalRef.current) {
      clearInterval(previewIntervalRef.current)
      previewIntervalRef.current = null
    }
  }

  const generateSlideshow = async () => {
    if (images.length === 0) {
      toast.error('スライドショーを作成するには画像が必要です')
      return
    }

    setIsGenerating(true)
    setProgress(0)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/slideshows/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          albumId,
          bgm,
          transition,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.slideshow_id) {
          const slideshowId = data.data.slideshow_id
          
          // プログレスシミュレーション
          let consecutiveErrors = 0
          const maxConsecutiveErrors = 5
          
          const progressInterval = setInterval(async () => {
            try {
              // スライドショーの状態を確認
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒タイムアウト
              
              const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/slideshows/status/${slideshowId}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
                signal: controller.signal
              })
              
              clearTimeout(timeoutId)
              consecutiveErrors = 0 // 成功時はエラーカウンターをリセット
              
              if (statusResponse.ok) {
                const statusData = await statusResponse.json()
                const slideshow = statusData.data.slideshow
                
                if (slideshow.status === 'completed') {
                  clearInterval(progressInterval)
                  setProgress(100)
                  setTimeout(() => {
                    setIsGenerating(false)
                    toast.success('スライドショーの生成が完了しました！')
                    router.push('/')
                  }, 1000)
                } else if (slideshow.status === 'failed') {
                  clearInterval(progressInterval)
                  setIsGenerating(false)
                  toast.error('スライドショーの生成に失敗しました')
                } else {
                  // 処理中の場合はプログレスを更新
                  setProgress(prev => Math.min(prev + Math.random() * 5, 95))
                }
              } else {
                console.warn('Status check failed:', statusResponse.status)
                consecutiveErrors++
                if (consecutiveErrors >= maxConsecutiveErrors) {
                  clearInterval(progressInterval)
                  setIsGenerating(false)
                  toast.error('サーバーとの通信に問題が発生しました。しばらく待ってから再度お試しください。')
                  return
                }
                // プログレスは続行
                setProgress(prev => Math.min(prev + Math.random() * 5, 95))
              }
            } catch (error) {
              console.error('Status check error:', error)
              consecutiveErrors++
              
              if (error instanceof Error && error.name === 'AbortError') {
                console.warn('Status check timed out')
              }
              
              if (consecutiveErrors >= maxConsecutiveErrors) {
                clearInterval(progressInterval)
                setIsGenerating(false)
                toast.error('サーバーとの通信に問題が発生しました。しばらく待ってから再度お試しください。')
                return
              }
              
              // エラーが発生してもプログレスは続行（サーバーが再起動中の場合など）
              setProgress(prev => Math.min(prev + Math.random() * 5, 95))
            }
          }, 5000) // チェック間隔を5秒に延長
        } else {
          throw new Error('スライドショーの生成に失敗しました')
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || 'スライドショーの生成に失敗しました')
      }
    } catch (error) {
      console.error('Generate slideshow error:', error)
      toast.error(error instanceof Error ? error.message : 'スライドショーの生成に失敗しました')
      setIsGenerating(false)
      setProgress(0)
    }
  }

  const handleBack = () => {
    router.back()
  }

  if (images.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
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
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <div className="bg-white rounded-lg shadow-md p-12">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h2 className="text-xl font-medium text-gray-900 mb-2">画像がありません</h2>
            <p className="text-gray-600 mb-6">スライドショーを作成するには画像が必要です。</p>
            <button
              onClick={() => router.push(`/edit/${albumId}`)}
              className="btn-primary"
            >
              画像を編集
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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={isGenerating}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            戻る
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* スライドショーのプレビュー */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">スライドショーのプレビュー</h2>
            
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
              {images.length > 0 && (
                <img
                  key={currentPreviewIndex}
                  src={images[currentPreviewIndex].url}
                  alt={images[currentPreviewIndex].filename}
                  className="w-full h-full object-contain animate-fade-in"
                />
              )}
              
              {/* プレビューオーバーレイ */}
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                {currentPreviewIndex + 1} / {images.length}
              </div>
              
              {/* プレビューコントロール */}
              {images.length > 1 && (
                <div className="absolute top-4 right-4 flex space-x-2">
                  <button
                    onClick={startPreview}
                    disabled={isGenerating}
                    className="bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm hover:bg-opacity-70 disabled:opacity-50"
                  >
                    再生
                  </button>
                  <button
                    onClick={stopPreview}
                    disabled={isGenerating}
                    className="bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm hover:bg-opacity-70 disabled:opacity-50"
                  >
                    停止
                  </button>
                </div>
              )}
            </div>
            
            <p className="text-sm text-gray-500 mt-2">
              {images.length > 1 ? 'プレビューは2秒間隔で自動切り替えされます' : '画像が1枚の場合はプレビューは表示されません'}
            </p>
          </div>

          {/* 設定オプション */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">スライドショー設定</h2>
            
            <div className="space-y-6">
              {/* BGM選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  BGM
                </label>
                <select
                  value={bgm}
                  onChange={(e) => setBgm(e.target.value)}
                  disabled={isGenerating}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
                >
                  {bgmOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 切り替え効果選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  切り替え効果
                </label>
                <select
                  value={transition}
                  onChange={(e) => setTransition(e.target.value)}
                  disabled={isGenerating}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
                >
                  {transitionOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 生成ボタン */}
          <div className="text-center">
            {!isGenerating ? (
              <button
                onClick={generateSlideshow}
                className="btn-primary text-lg px-8 py-4"
              >
                生成を開始
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">スライドショーを生成中...</h3>
                  
                  {/* プログレスバー */}
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                    <div
                      className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    {Math.round(Math.min(progress, 100))}% 完了
                  </p>
                  
                  <div className="text-xs text-gray-500">
                    <p>• {images.length}枚の画像を処理中</p>
                    <p>• 動画ファイルを生成中</p>
                    <p>• 完了まで数分かかる場合があります</p>
                  </div>
                </div>
                
                <div className="text-sm text-gray-500">
                  生成には数分かかる場合があります。この画面を閉じても処理は続行されます。
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-in-out;
        }
      `}</style>
    </div>
  )
}
