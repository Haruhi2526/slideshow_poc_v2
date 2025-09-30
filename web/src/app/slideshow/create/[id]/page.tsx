'use client'

import { AuthProvider, useAuth } from '@/components/AuthProvider'
import { SlideshowCreateScreen } from '@/components/SlideshowCreateScreen'
import { LoginScreen } from '@/components/LoginScreen'

interface SlideshowCreatePageProps {
  params: {
    id: string
  }
}

function SlideshowCreateContent({ albumId }: { albumId: string }) {
  const { user, isLoading } = useAuth()

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

  return <SlideshowCreateScreen albumId={albumId} />
}

export default function SlideshowCreatePage({ params }: SlideshowCreatePageProps) {
  return (
    <AuthProvider>
      <SlideshowCreateContent albumId={params.id} />
    </AuthProvider>
  )
}
