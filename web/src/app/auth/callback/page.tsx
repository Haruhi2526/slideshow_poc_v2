'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import toast from 'react-hot-toast'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const error = searchParams.get('error')

      if (error) {
        toast.error('LINE認証に失敗しました')
        router.push('/')
        return
      }

      if (!code) {
        toast.error('認証コードが取得できませんでした')
        router.push('/')
        return
      }

      try {
        // バックエンドに認証コードを送信
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/line/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            state,
          }),
        })

        const data = await response.json()

        if (data.success) {
          // 認証成功
          const { user, token } = data.data
          
          // ローカルストレージにトークンを保存
          localStorage.setItem('auth_token', token)
          
          toast.success('ログインしました')
          router.push('/')
        } else {
          toast.error(data.error.message || '認証に失敗しました')
          router.push('/')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        toast.error('認証処理中にエラーが発生しました')
        router.push('/')
      } finally {
        setIsProcessing(false)
      }
    }

    handleCallback()
  }, [searchParams, router, login])

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">認証処理中...</p>
        </div>
      </div>
    )
  }

  return null
}
