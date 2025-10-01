'use client'

import { AuthProvider, useAuth } from '@/components/AuthProvider'
import { ImageEditScreen } from '@/components/ImageEditScreen'
import { LoginScreen } from '@/components/LoginScreen'

interface EditPageProps {
  params: {
    id: string
  }
}

function EditContent({ albumId }: { albumId: string }) {
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

  return <ImageEditScreen albumId={albumId} />
}

export default function EditPage({ params }: EditPageProps) {
  return (
    <AuthProvider>
      <EditContent albumId={params.id} />
    </AuthProvider>
  )
}
