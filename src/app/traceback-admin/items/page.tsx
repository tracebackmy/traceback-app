'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Item } from '@/types/item'; // Use the shared type

export default function AdminItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'lost' | 'found'>('all');

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

  const filteredItems = items.filter(item => 
    filter === 'all' || item.type === filter
  );

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
      <div className="animate-pulse p-6">
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
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Items</h1>
          <p className="text-gray-600 mt-1">View and manage Lost & Found inventory and reports</p>
        </div>
        <Link
          href="/traceback-admin/items/new"
          className="bg-[#FF385C] text-white px-4 py-2 rounded-lg hover:bg-[#E31C5F] transition-colors flex items-center"
        >
          <span className="mr-2">+</span> Add New Item
        </Link>
      </div>

      {/* Filters */}
      <div className="flex space-x-2 bg-white p-1 rounded-lg border border-gray-200 w-fit">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filter === 'all' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          All Items
        </button>
        <button
          onClick={() => setFilter('lost')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filter === 'lost' ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Lost Reports
        </button>
        <button
          onClick={() => setFilter('found')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filter === 'found' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Found Inventory
        </button>
      </div>

      {/* Items List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location / Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No items found matching the current filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {item.imageUrls && item.imageUrls.length > 0 && (
                          <img 
                            src={item.imageUrls[0]} 
                            alt="" 
                            className="h-10 w-10 rounded object-cover mr-3 border border-gray-200"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.title}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">{item.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
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
                        className={`text-sm border-gray-300 rounded px-2 py-1 border focus:ring-2 focus:ring-[#FF385C] focus:border-transparent cursor-pointer ${
                          item.status === 'resolved' ? 'text-green-700 bg-green-50' :
                          item.status === 'closed' ? 'text-gray-500 bg-gray-50' : 'text-gray-900'
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
                        className="text-[#FF385C] hover:text-[#E31C5F] font-medium"
                      >
                        Manage
                      </Link>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
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