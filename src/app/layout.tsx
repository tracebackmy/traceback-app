import { AuthProvider } from '@/components/AuthProvider'
import ChatBoxComponent from '@/components/ChatBox'
import Navbar from '@/components/Navbar'
import './globals.css'
import { Inter } from 'next/font/google'
import { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

// Set Metadata
export const metadata: Metadata = {
  title: 'Traceback - Lost & Found, Reimagined',
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
      <body className={inter.className}>
        {/* AuthProvider wraps the whole app for universal access */}
        <AuthProvider>
          {/* Navbar only renders if not on an admin route (check inside Navbar.tsx) */}
          <Navbar />
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
          {/* Global User Chat Button/Box */}
          <ChatBoxComponent />
        </AuthProvider>
      </body>
    </html>
  )
}