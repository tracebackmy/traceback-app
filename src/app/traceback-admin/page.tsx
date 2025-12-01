import { AuthProvider } from '@/components/AuthProvider'
import { ToastProvider } from '@/components/ToastProvider'
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
          <ToastProvider>
            <Navbar />
            <main className="min-h-screen bg-gray-50">
              {children}
            </main>
            <ChatBoxComponent />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}