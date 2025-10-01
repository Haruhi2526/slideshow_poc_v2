'use client'

import { useParams } from 'next/navigation'
import { AuthProvider, useAuth } from '@/components/AuthProvider'
import { Header } from '@/components/Header'
import { SlideshowList } from '@/components/SlideshowList'
import { LoginScreen } from '@/components/LoginScreen'

function SlideshowListContent() {
  const { user, isLoading } = useAuth()
  const params = useParams()
  const albumId = params.id as string

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
        <SlideshowList albumId={albumId} />
      </main>
    </div>
  )
}

export default function SlideshowListPage() {
  return (
    <AuthProvider>
      <SlideshowListContent />
    </AuthProvider>
  )
}
