'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Item, ItemStatus } from '@/types/item'; // Import Item, ItemStatus
import { safeDateConvert } from '@/lib/date-utils'; // Import date utility
// FIX: Import Image component
import Image from 'next/image';

// FIX: Use the Item interface directly, adjusting the date type for display
interface ItemDisplay extends Omit<Item, 'createdAt' | 'updatedAt'> {
  createdAt: { toDate: () => Date };
  updatedAt: { toDate: () => Date };
}


export default function AdminItems() {
  const [items, setItems] = useState<ItemDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'lost' | 'found'>('all');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      // FIX: Added explicit orderBy for the security rule compatibility
      const itemsQuery = query(collection(db, 'items'), orderBy('createdAt', 'desc')); 
      const snapshot = await getDocs(itemsQuery);
      const itemsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ItemDisplay[];
      setItems(itemsData);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      await deleteDoc(doc(db, 'items', itemId));
      setItems(items.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const updateItemStatus = async (itemId: string, status: ItemStatus) => {
    try {
      // FIX: Use ItemStatus type
      await updateDoc(doc(db, 'items', itemId), { status, updatedAt: Timestamp.now() }); 
      setItems(items.map(item => 
        item.id === itemId ? { ...item, status: status as any, updatedAt: Timestamp.now() as any } : item
      ));
    } catch (error) {
      console.error('Error updating item status:', error);
    }
  };

  const filteredItems = items.filter(item => 
    filter === 'all' || item.type === filter
  );

  const formatDate = (timestamp: unknown) => {
    if (!timestamp) return 'N/A';
    try {
      const date = safeDateConvert(timestamp);
      return date.toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };
  
  const getStatusColor = (status: ItemStatus) => {
    switch (status) {
      case 'reported': return 'bg-yellow-100 text-yellow-800';
      case 'match_found': return 'bg-blue-100 text-blue-800';
      case 'pending_verification': return 'bg-orange-100 text-orange-800';
      case 'listed': return 'bg-green-100 text-green-800';
      case 'resolved': return 'bg-gray-100 text-gray-800';
      case 'closed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };


  if (loading) {
    return (
      <div className="animate-pulse">
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Manage Items</h1>
        <Link
          href="/traceback-admin/items/new"
          className="bg-[#FF385C] text-white px-4 py-2 rounded-lg hover:bg-[#E31C5F] transition-colors"
        >
          Add New Item
        </Link>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'all' ? 'bg-[#FF385C] text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          All Items
        </button>
        <button
          onClick={() => setFilter('lost')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'lost' ? 'bg-[#FF385C] text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Lost Items
        </button>
        <button
          onClick={() => setFilter('found')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'found' ? 'bg-[#FF385C] text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Found Items
        </button>
      </div>

      {/* Items List */}
      <div className="bg-white shadow rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className='flex items-center space-x-3'>
                        {item.imageUrls && item.imageUrls.length > 0 ? (
                            <Image
                                src={item.imageUrls[0]}
                                alt={item.title}
                                width={40}
                                height={40}
                                className='w-10 h-10 object-cover rounded-md flex-shrink-0'
                            />
                        ) : (
                            <div className='w-10 h-10 bg-gray-200 rounded-md flex-shrink-0'></div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.title}</div>
                          <div className="text-xs text-gray-500">{item.category}</div>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.type === 'lost' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.stationId}
                    <div className='text-xs text-gray-400'>{formatDate(item.createdAt)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* FIX: Use the full set of statuses */}
                    <select
                      value={item.status}
                      onChange={(e) => updateItemStatus(item.id, e.target.value as ItemStatus)}
                      className={`text-sm border border-gray-300 rounded px-2 py-1 ${getStatusColor(item.status as ItemStatus)}`}
                    >
                      <option value="pending_verification">Pending Verification</option>
                      <option value="reported">Reported (Lost)</option>
                      <option value="listed">Listed (Found)</option>
                      <option value="match_found">Match Found</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Link
                      href={`/traceback-admin/items/${item.id}`}
                      className="text-[#FF385C] hover:text-[#E31C5F]"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No items found</p>
            <p className="text-gray-400 mt-2">Try changing your filters or add new items</p>
          </div>
        )}
      </div>
    </div>
  );
}