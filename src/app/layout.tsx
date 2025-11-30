
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { DataProvider } from '@/contexts/DataContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'TraceBack • Lost & Found, Reimagined',
  description: 'An intelligent lost and found management system for public transit.',
  icons: {
    icon: '/TRACEBACK.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-white text-ink antialiased`}>
        <AuthProvider>
          <NotificationProvider>
            <DataProvider>
              {children}
            </DataProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
