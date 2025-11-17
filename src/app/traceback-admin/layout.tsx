import { AuthProvider } from '@/components/AuthProvider'
import ChatBoxComponent from '@/components/ChatBox'
import Navbar from '@/components/Navbar'
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Traceback - Lost & Found',
  description: 'Find your lost items in MRT/LRT/KTM stations',
  icons: {
    icon: '/TRACEBACK.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/TRACEBACK.png" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {/* User navbar - only shows on non-admin routes */}
          <UserNavbarWrapper />
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
          <ChatBoxComponent />
        </AuthProvider>
      </body>
    </html>
  )
}

// This ensures user navbar doesn't show on admin routes
async function UserNavbarWrapper() {
  // For App Router, we need to handle this differently
  // The actual route checking happens in the Navbar component
  return <Navbar />
}