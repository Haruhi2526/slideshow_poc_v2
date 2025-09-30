'use client'

import { useAuth } from './AuthProvider'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function LoginScreen() {
  const { user, isLoading, login } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/')
    }
  }, [user, isLoading, router])

  const handleLineLogin = () => {
    // LINE認証の実装
    // 実際の実装では、LINE Login APIを使用して認証フローを開始
    console.log('LINE Login clicked')
    
    // テスト用のダミーログイン
    const testUserId = prompt('テスト用LINE User IDを入力してください（例: test_user_123）:')
    if (testUserId) {
      login(testUserId, 'テストユーザー', '')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* アプリケーションのロゴ */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-primary-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">スライドショー作成</h1>
        </div>

        {/* キャッチコピー */}
        <p className="text-gray-600 mb-8 text-lg">
          思い出の写真を、感動のスライドショーに
        </p>

        {/* LINEでログイン/新規登録ボタン */}
        <button
          onClick={handleLineLogin}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-3 mb-4"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .63.285.63.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
          </svg>
          <span>LINEでログイン/新規登録</span>
        </button>

        {/* テスト用ログインボタン */}
        <button
          onClick={() => {
            const testUserId = prompt('テスト用LINE User IDを入力してください（例: test_user_123）:')
            if (testUserId) {
              login(testUserId, 'テストユーザー', '')
            }
          }}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          テスト用ログイン
        </button>

        {/* フッター */}
        <p className="text-xs text-gray-500 mt-6">
          ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます。
        </p>
      </div>
    </div>
  )
}
