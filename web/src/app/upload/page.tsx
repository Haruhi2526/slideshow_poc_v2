'use client'

import { AuthProvider, useAuth } from '@/components/AuthProvider'
import { ImageUploadScreen } from '@/components/ImageUploadScreen'
import { LoginScreen } from '@/components/LoginScreen'

function UploadContent() {
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

  return <ImageUploadScreen />
}

export default function UploadPage() {
  return (
    <AuthProvider>
      <UploadContent />
    </AuthProvider>
  )
}
