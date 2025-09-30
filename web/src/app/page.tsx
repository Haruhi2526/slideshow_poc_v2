'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthProvider } from '@/components/AuthProvider'
import { Header } from '@/components/Header'
import { AlbumList } from '@/components/AlbumList'
import { CreateAlbumModal } from '@/components/CreateAlbumModal'

export default function Home() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">マイアルバム</h1>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary"
            >
              新しいアルバムを作成
            </button>
          </div>
          
          <AlbumList />
        </main>
        
        <CreateAlbumModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </div>
    </AuthProvider>
  )
}

