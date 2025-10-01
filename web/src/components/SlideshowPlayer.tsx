'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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

interface SlideshowPlayerProps {
  slideshowId: string
}

export function SlideshowPlayer({ slideshowId }: SlideshowPlayerProps) {
  const router = useRouter()
  const { token } = useAuth()
  const [slideshow, setSlideshow] = useState<Slideshow | null>(null)
  
  // デバッグログを追加
  console.log('SlideshowPlayer - slideshowId:', slideshowId)
  console.log('SlideshowPlayer - token:', token ? 'exists' : 'missing')
  const [album, setAlbum] = useState<Album | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [isVideoLoading, setIsVideoLoading] = useState(true)
  const [authError, setAuthError] = useState(false)
  const [tempVideoUrl, setTempVideoUrl] = useState<string | null>(null)
  const [isGeneratingTempUrl, setIsGeneratingTempUrl] = useState(false)
  const [showPlayButton, setShowPlayButton] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchSlideshow = useCallback(async () => {
    if (!token) {
      console.log('No token available, skipping slideshow fetch')
      return
    }
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/slideshows/${slideshowId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSlideshow(data.data.slideshow)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('API Error:', errorData)
        const errorMessage = `スライドショーの取得に失敗しました: ${errorData.error?.message || response.statusText}`
        toast.error(errorMessage)
        return
      }
    } catch (error) {
      console.error('Fetch slideshow error:', error)
      if (!(error instanceof Error && error.message.includes('スライドショーの取得に失敗しました'))) {
        toast.error('スライドショーの取得に失敗しました')
      }
    }
  }, [slideshowId, token])

  const fetchAlbum = useCallback(async () => {
    if (!slideshow || !token) return
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/albums/${slideshow.album_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAlbum(data.data.album)
      } else {
        console.error('Failed to fetch album')
      }
    } catch (error) {
      console.error('Fetch album error:', error)
    }
  }, [slideshow, token])

  const generateTempVideoUrl = useCallback(async () => {
    console.log('generateTempVideoUrl called with slideshowId:', slideshowId)
    if (!token || !slideshowId) {
      console.log('generateTempVideoUrl: missing token or slideshowId')
      return
    }
    
    setIsGeneratingTempUrl(true)
    try {
      // API URLの確認とフォールバック
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      console.log('Using API URL:', apiUrl)
      
      const response = await fetch(`${apiUrl}/api/slideshows/play/${slideshowId}/temp-url`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log('API response data:', data)
        console.log('data.data:', data.data)
        console.log('data.data.tempUrl:', data.data.tempUrl)
        setTempVideoUrl(data.data.tempUrl)
        console.log('Temporary video URL generated:', data.data.tempUrl)
        
        // 直接動画要素に設定
        if (videoRef.current && data.data.tempUrl) {
          console.log('Setting video src directly to:', data.data.tempUrl)
          videoRef.current.src = data.data.tempUrl
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to generate temp URL:', errorData)
        toast.error('動画URLの生成に失敗しました')
      }
    } catch (error) {
      console.error('Generate temp URL error:', error)
      toast.error('動画URLの生成に失敗しました')
    } finally {
      setIsGeneratingTempUrl(false)
    }
  }, [token, slideshowId])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      
      // 認証状態を確認
      if (token) {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const authResponse = await fetch(`${apiUrl}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })
          
          if (!authResponse.ok) {
            console.error('Auth check failed:', authResponse.status)
            setAuthError(true)
            setIsLoading(false)
            return
          }
        } catch (error) {
          console.error('Auth check error:', error)
          setAuthError(true)
          setIsLoading(false)
          return
        }
      }
      
      await fetchSlideshow()
      setIsLoading(false)
    }
    
    loadData()
  }, [fetchSlideshow, token])

  useEffect(() => {
    if (slideshow) {
      console.log('Slideshow loaded, fetching album and generating temp URL')
      fetchAlbum()
      // スライドショーが取得できたら一時的なURLを生成
      generateTempVideoUrl()
    }
  }, [slideshow, fetchAlbum, generateTempVideoUrl])

  // tempVideoUrlの変更を監視
  useEffect(() => {
    console.log('tempVideoUrl changed:', tempVideoUrl)
    if (videoRef.current && tempVideoUrl) {
      console.log('Setting video src to:', tempVideoUrl)
      videoRef.current.src = tempVideoUrl
      console.log('Video src after setting:', videoRef.current.src)
    }
  }, [tempVideoUrl])

  // 動画イベントハンドラー
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      console.log('Video time update:', videoRef.current.currentTime)
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handlePlay = () => {
    console.log('Video play event fired')
    console.log('Video paused:', videoRef.current?.paused)
    console.log('Video currentTime:', videoRef.current?.currentTime)
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleError = async (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('Video error:', e)
    const video = e.currentTarget
    const error = video.error
    
    // より詳細なエラー情報をログ出力
    console.error('Video element:', video)
    console.error('Video src:', video.src)
    console.error('Video networkState:', video.networkState)
    console.error('Video readyState:', video.readyState)
    console.error('Video error details:', error)
    
    let errorMessage = '動画の読み込みに失敗しました'
    let errorDetails = ''
    let isAuthError = false
    
    if (error) {
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      
      switch (error.code) {
        case error.MEDIA_ERR_ABORTED:
          errorMessage = '動画の読み込みが中断されました'
          errorDetails = 'ユーザーが読み込みを中断したか、ネットワーク接続が不安定です'
          break
        case error.MEDIA_ERR_NETWORK:
          errorMessage = 'ネットワークエラーが発生しました'
          errorDetails = 'サーバーとの通信に問題があります。認証トークンが無効な可能性があります'
          isAuthError = true
          break
        case error.MEDIA_ERR_DECODE:
          errorMessage = '動画のデコードに失敗しました'
          errorDetails = '動画ファイルが破損しているか、サポートされていない形式です'
          break
        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'この動画形式はサポートされていません'
          errorDetails = 'ブラウザがこの動画形式をサポートしていません'
          break
        default:
          errorMessage = '不明なエラーが発生しました'
          errorDetails = `エラーコード: ${error.code}, メッセージ: ${error.message}`
      }
    } else {
      errorDetails = '動画要素でエラーが発生しましたが、詳細なエラー情報が取得できませんでした'
    }
    
    // 認証エラーの場合は追加の確認を行う
    if (isAuthError || error?.code === error?.MEDIA_ERR_NETWORK) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const response = await fetch(`${apiUrl}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        
        if (!response.ok) {
          console.error('Auth check failed:', response.status)
          setAuthError(true)
          errorMessage = '認証エラーが発生しました'
          errorDetails = 'ログインし直してください'
        }
      } catch (authError) {
        console.error('Auth check error:', authError)
        setAuthError(true)
        errorMessage = '認証エラーが発生しました'
        errorDetails = 'ログインし直してください'
      }
    }
    
    console.error('Final error message:', errorMessage)
    console.error('Final error details:', errorDetails)
    
    setVideoError(`${errorMessage}\n${errorDetails}`)
    setIsVideoLoading(false)
    toast.error(errorMessage)
  }

  const handleLoadStart = () => {
    console.log('Video load start - src:', videoRef.current?.src)
    setIsVideoLoading(true)
    setVideoError(null)
  }

  const handleCanPlay = () => {
    console.log('Video can play - ready to start playback')
    setIsVideoLoading(false)
    setVideoError(null)
    
    // 自動再生を試行
    if (videoRef.current) {
      console.log('Attempting autoplay...')
      videoRef.current.play().then(() => {
        console.log('Autoplay successful!')
        console.log('Video paused:', videoRef.current?.paused)
        console.log('Video currentTime:', videoRef.current?.currentTime)
        console.log('Video duration:', videoRef.current?.duration)
        console.log('Video readyState:', videoRef.current?.readyState)
        setIsPlaying(true)
      }).catch((error) => {
        console.log('Autoplay failed:', error)
        console.log('User interaction required to start playback')
        // 再生ボタンを表示
        setShowPlayButton(true)
      })
    }
  }

  const handleLoadedData = () => {
    console.log('Video data loaded')
  }

  const handleProgress = () => {
    console.log('Video loading progress')
  }

  // コントロール表示/非表示
  const showControlsTemporarily = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
  }

  const handleMouseMove = () => {
    showControlsTemporarily()
  }

  const handleMouseLeave = () => {
    if (isPlaying) {
      setShowControls(false)
    }
  }

  // 再生コントロール
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
      setVolume(newVolume)
      setIsMuted(newVolume === 0)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  const handlePlaybackRateChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate
      setPlaybackRate(rate)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!slideshow) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-xl font-medium text-gray-900 mb-2">スライドショーが見つかりません</h2>
        <p className="text-gray-600 mb-6">指定されたスライドショーが存在しないか、アクセス権限がありません。</p>
        <button
          onClick={() => router.back()}
          className="btn-primary"
        >
          戻る
        </button>
      </div>
    )
  }

  if (slideshow.status !== 'completed') {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-xl font-medium text-gray-900 mb-2">
          {slideshow.status === 'processing' ? 'スライドショーを処理中です' : 'スライドショーの生成に失敗しました'}
        </h2>
        <p className="text-gray-600 mb-6">
          {slideshow.status === 'processing' 
            ? 'しばらく待ってから再度お試しください。' 
            : 'スライドショーの生成中にエラーが発生しました。'}
        </p>
        <button
          onClick={() => router.back()}
          className="btn-primary"
        >
          戻る
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {album ? album.name : 'スライドショー'} の再生
          </h2>
          <p className="text-gray-600 mt-1">
            {slideshow.filename} • {formatFileSize(slideshow.file_size)}
          </p>
        </div>
        
        <button
          onClick={() => router.back()}
          className="btn-secondary"
        >
          戻る
        </button>
      </div>

      {/* 動画プレイヤー */}
      <div 
        ref={containerRef}
        className="relative bg-black rounded-lg overflow-hidden group"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {console.log('Rendering video with tempVideoUrl:', tempVideoUrl)}
        <video
          ref={videoRef}
          className="w-full aspect-video"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onError={handleError}
          onLoadStart={handleLoadStart}
          onCanPlay={handleCanPlay}
          onLoadedData={handleLoadedData}
          onProgress={handleProgress}
          onClick={togglePlay}
          crossOrigin="anonymous"
          preload="metadata"
          autoPlay
          muted
        />

        {/* 読み込み中表示 */}
        {(isVideoLoading || isGeneratingTempUrl) && !videoError && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-lg">
                {isGeneratingTempUrl ? '動画URLを生成中...' : '動画を読み込み中...'}
              </p>
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {videoError && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="text-center text-white p-6 max-w-md">
              <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-medium mb-2">
                {authError ? '認証エラー' : '動画の読み込みエラー'}
              </h3>
              <div className="text-gray-300 mb-4 text-sm whitespace-pre-line">
                {videoError}
              </div>
              <div className="space-x-4">
                {authError ? (
                  <button
                    onClick={() => {
                      // ログイン画面にリダイレクト
                      window.location.href = '/'
                    }}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm"
                  >
                    ログインし直す
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setVideoError(null)
                        setIsVideoLoading(true)
                        setAuthError(false)
                        // 一時的なURLを再生成
                        generateTempVideoUrl()
                      }}
                      className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm"
                    >
                      再試行
                    </button>
                    <button
                      onClick={() => {
                        if (tempVideoUrl) {
                          window.open(tempVideoUrl, '_blank')
                        } else {
                          toast.error('動画URLが生成されていません')
                        }
                      }}
                      className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-sm"
                    >
                      新しいタブで開く
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* コントロールオーバーレイ */}
        <div className={`absolute inset-0 bg-black bg-opacity-0 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        } group-hover:opacity-100`}>
          {/* 中央の再生ボタン */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={togglePlay}
              className="bg-black bg-opacity-50 text-white rounded-full p-4 hover:bg-opacity-70 transition-all"
            >
              {isPlaying ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
          </div>

          {/* 下部コントロール */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
            {/* プログレスバー */}
            <div className="mb-4">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* コントロールボタン */}
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-4">
                <button onClick={togglePlay} className="hover:text-gray-300">
                  {isPlaying ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>

                <div className="flex items-center space-x-2">
                  <button onClick={toggleMute} className="hover:text-gray-300">
                    {isMuted ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                      </svg>
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                <div className="text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* 再生速度 */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm">速度:</span>
                  <select
                    value={playbackRate}
                    onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                    className="bg-transparent text-white text-sm border border-gray-600 rounded px-2 py-1"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={0.75}>0.75x</option>
                    <option value={1}>1x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2x</option>
                  </select>
                </div>

                <button onClick={toggleFullscreen} className="hover:text-gray-300">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* スライドショー情報 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">スライドショー情報</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">ファイル名:</span>
            <span className="ml-2 text-gray-900">{slideshow.filename}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">ファイルサイズ:</span>
            <span className="ml-2 text-gray-900">{formatFileSize(slideshow.file_size)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">再生時間:</span>
            <span className="ml-2 text-gray-900">{formatTime(slideshow.duration)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">作成日:</span>
            <span className="ml-2 text-gray-900">{new Date(slideshow.created_at).toLocaleDateString('ja-JP')}</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}
