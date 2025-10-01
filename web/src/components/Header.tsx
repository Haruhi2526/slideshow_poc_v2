'use client'

import { useAuth } from './AuthProvider'
import { useState } from 'react'

export function Header() {
  const { user, logout, isLoading, login } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  if (isLoading) {
    return (
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900">Slideshow App</h1>
            <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>
          </div>
        </div>
      </header>
    )
  }

  if (!user) {
    return (
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900">Slideshow App</h1>
            <button
              onClick={() => {
                // テスト用ログイン
                const lineUserId = prompt('テスト用LINE User IDを入力してください（例: test_user_123）:')
                if (lineUserId) {
                  login(lineUserId, 'テストユーザー', '')
                }
              }}
              className="btn-primary"
            >
              テストログイン
            </button>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Slideshow App</h1>
          
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
            >
              {user.picture_url ? (
                <img
                  src={user.picture_url}
                  alt={user.display_name}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {user.display_name?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
              <span className="text-sm font-medium">{user.display_name || 'ユーザー'}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                <button
                  onClick={() => {
                    logout()
                    setIsMenuOpen(false)
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  ログアウト
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

