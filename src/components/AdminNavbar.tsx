'use client';

import Link from 'next/link';
import { useAdmin } from '@/components/AdminProvider';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function AdminNavbar() {
  const { admin, logout } = useAdmin();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/traceback-admin/dashboard' },
    { name: 'Items', href: '/traceback-admin/items' },
    { name: 'Tickets', href: '/traceback-admin/tickets' },
    { name: 'Users', href: '/traceback-admin/users' },
    { name: 'CCTV', href: '/traceback-admin/cctv' },
    { name: 'Claims', href: '/traceback-admin/claims' },
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/traceback-admin/dashboard" className="flex items-center">
              <Image 
                src="/TRACEBACK.png" 
                alt="Traceback Logo" 
                width={32} 
                height={32} 
                className="mr-2"
              />
              <span className="text-xl font-bold text-[#FF385C]">
                Traceback Admin
              </span>
            </Link>
            <div className="ml-10 flex items-baseline space-x-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === item.href
                      ? 'bg-[#FF385C] text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {admin?.email || 'Admin'}
            </span>
            <Link 
              href="/"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Main Site
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}