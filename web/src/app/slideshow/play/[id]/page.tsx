'use client'

import { useParams } from 'next/navigation'
import { AuthProvider, useAuth } from '@/components/AuthProvider'
import { Header } from '@/components/Header'
import { SlideshowPlayer } from '@/components/SlideshowPlayer'
import { LoginScreen } from '@/components/LoginScreen'

function SlideshowPlayContent() {
  const { user, isLoading } = useAuth()
  const params = useParams()
  const slideshowId = params.id as string

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <SlideshowPlayer slideshowId={slideshowId} />
      </main>
    </div>
  )
}

export default function SlideshowPlayPage() {
  return (
    <AuthProvider>
      <SlideshowPlayContent />
    </AuthProvider>
  )
}
