'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Item } from '@/types/item'; 

export default function AdminItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'lost' | 'found'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const itemsQuery = query(collection(db, 'items'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(itemsQuery);
      const itemsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Item[];
      setItems(itemsData);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) return;
    
    try {
      await deleteDoc(doc(db, 'items', itemId));
      setItems(items.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const updateItemStatus = async (itemId: string, status: Item['status']) => {
    try {
      await updateDoc(doc(db, 'items', itemId), { status });
      setItems(items.map(item => 
        item.id === itemId ? { ...item, status } : item
      ));
    } catch (error) {
      console.error('Error updating item status:', error);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesFilter = filter === 'all' || item.type === filter;
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.stationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Items</h1>
          <p className="text-gray-600 mt-1">View and manage Lost & Found inventory and reports</p>
        </div>
        <Link
          href="/traceback-admin/items/new"
          className="bg-[#FF385C] text-white px-6 py-3 rounded-lg hover:bg-[#E31C5F] transition-colors font-medium shadow-sm flex items-center"
        >
          <span className="mr-2 text-lg">+</span> Register Found Item
        </Link>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex space-x-2 bg-gray-50 p-1 rounded-lg">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('lost')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              filter === 'lost' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-red-600'
            }`}
          >
            Lost Reports
          </button>
          <button
            onClick={() => setFilter('found')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              filter === 'found' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-green-600'
            }`}
          >
            Found Inventory
          </button>
        </div>
        
        <div className="relative w-full sm:w-72">
           <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-10"
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Item Details</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location / Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                      <p className="text-lg font-medium">No items found</p>
                      <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {item.imageUrls && item.imageUrls.length > 0 ? (
                          <img 
                            src={item.imageUrls[0]} 
                            alt="" 
                            className="h-12 w-12 rounded-lg object-cover mr-4 border border-gray-200 group-hover:scale-105 transition-transform"
                          />
                        ) : (
                           <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center mr-4 border border-gray-200 text-xs text-gray-400">No Img</div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.title}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">{item.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${
                        item.type === 'lost' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {item.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.stationId}</div>
                      <div className="text-xs text-gray-500">{formatDate(item.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={item.status}
                        onChange={(e) => updateItemStatus(item.id, e.target.value as Item['status'])}
                        className={`text-xs font-medium border-gray-300 rounded-md px-2 py-1 border focus:ring-2 focus:ring-[#FF385C] focus:border-transparent cursor-pointer ${
                          item.status === 'resolved' ? 'text-green-700 bg-green-50' :
                          item.status === 'closed' ? 'text-gray-500 bg-gray-50' : 
                          item.status === 'claimed' ? 'text-blue-700 bg-blue-50' : 'text-gray-900 bg-white'
                        }`}
                      >
                        <option value="open">Open</option>
                        <option value="claimed">Claimed</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center space-x-3">
                      <Link
                        href={`/traceback-admin/items/${item.id}`}
                        className="text-[#FF385C] hover:text-[#E31C5F] font-medium bg-pink-50 px-3 py-1.5 rounded-md hover:bg-pink-100 transition-colors"
                      >
                        Manage
                      </Link>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-md hover:bg-red-50"
                        title="Delete Item"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}