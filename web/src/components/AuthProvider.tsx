'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'

interface User {
  id: number
  line_user_id: string
  display_name: string
  picture_url?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (lineUserId: string, displayName?: string, pictureUrl?: string) => Promise<void>
  loginWithLine: () => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const savedToken = Cookies.get('auth_token')
    if (savedToken) {
      setToken(savedToken)
      // トークンからユーザー情報を取得
      fetchUserInfo(savedToken)
    } else {
      setIsLoading(false)
    }
  }, [])

  const fetchUserInfo = async (authToken: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.data.user)
      } else {
        // トークンが無効な場合
        Cookies.remove('auth_token')
        setToken(null)
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error)
      Cookies.remove('auth_token')
      setToken(null)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (lineUserId: string, displayName?: string, pictureUrl?: string) => {
    try {
      console.log('Attempting test login with userId:', lineUserId);
      console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
      
      // テストログインエンドポイントを使用
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/test/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: lineUserId,
        }),
      })

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const data = await response.json()
      console.log('Response data:', data);

      if (data.success) {
        setUser(data.data.user)
        setToken(data.data.token)
        Cookies.set('auth_token', data.data.token, { expires: 7 })
        toast.success('テストユーザーでログインしました')
        router.push('/')
      } else {
        console.error('Login failed:', data.error);
        toast.error(data.error.message || 'ログインに失敗しました')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('ログインに失敗しました')
    }
  }

  const loginWithLine = async () => {
    try {
      // LINE Login URLを取得
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/line/login`)
      const data = await response.json()
      
      if (data.success) {
        // LINE Loginページにリダイレクト
        window.location.href = data.data.loginUrl
      } else {
        toast.error('LINE Loginの初期化に失敗しました')
      }
    } catch (error) {
      console.error('LINE Login error:', error)
      toast.error('LINE Loginに失敗しました')
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    Cookies.remove('auth_token')
    toast.success('ログアウトしました')
    router.push('/')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, loginWithLine, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

