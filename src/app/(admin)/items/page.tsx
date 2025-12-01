'use client';

import React, { useEffect, useState } from 'react';
import { FirestoreService } from '@/lib/firebase/firestore';
import { Item, ItemStatus, TransitMode, ItemCategory } from '@/types';
import Link from 'next/link';

export default function AdminItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'lost' | 'found'>('all');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemData, setNewItemData] = useState({
      title: '',
      description: '',
      category: ItemCategory.Electronics as string,
      stationId: '',
      mode: TransitMode.MRT as TransitMode,
      line: '',
  });
  const [newItemImage, setNewItemImage] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    const all = await db.getItems();
    setItems(all.sort((a, b) => b.createdAt - a.createdAt));
    setLoading(false);
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
      // Cast string to ItemStatus enum after validation if needed
      await db.updateItemStatus(id, newStatus as ItemStatus);
      loadItems();
  };

  const handleDelete = async (id: string) => {
      if(confirm('Are you sure you want to delete this item record?')) {
          // For mock service, we just filter it out locally to simulate delete
          // In real backend, we'd call delete API
          setItems(items.filter(i => i.id !== id));
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => setNewItemImage(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  const handleAddItem = async (e: React.FormEvent) => {
      e.preventDefault();
      await db.createItem({
          ...newItemData,
          itemType: 'found',
          userId: 'admin_123',
          status: ItemStatus.Listed,
          keywords: newItemData.title.split(' ').concat(newItemData.category),
          imageUrls: newItemImage ? [newItemImage] : []
      });
      setShowAddModal(false);
      setNewItemData({
        title: '', description: '', category: ItemCategory.Electronics, stationId: '', mode: TransitMode.MRT, line: ''
      });
      setNewItemImage(null);
      loadItems();
      alert("Found item added successfully!");
  };

  const filteredItems = items.filter(i => filterType === 'all' ? true : i.itemType === filterType);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-ink">Item Management</h1>
            <p className="text-muted mt-1">Manage reported lost items and register found items.</p>
        </div>
        <button 
            onClick={() => setShowAddModal(true)}
            className="bg-brand text-white px-5 py-2.5 rounded-full font-bold shadow-soft hover:bg-brand-600 transition flex items-center gap-2"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Found Item
        </button>
      </div>

      <div className="flex bg-gray-100 p-1 rounded-lg w-fit mb-6">
          <button onClick={() => setFilterType('all')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${filterType === 'all' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'}`}>All Items</button>
          <button onClick={() => setFilterType('lost')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${filterType === 'lost' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'}`}>Reported Lost</button>
          <button onClick={() => setFilterType('found')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${filterType === 'found' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'}`}>Found at Station</button>
      </div>

      <div className="bg-white shadow-soft rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Reported</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                        <tr><td colSpan={5} className="text-center py-10">Loading items...</td></tr>
                    ) : filteredItems.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-10 text-muted">No items found.</td></tr>
                    ) : (
                        filteredItems.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                            {item.imageUrls[0] ? (
                                                <img className="h-full w-full object-cover" src={item.imageUrls[0]} alt="" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-gray-300">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-bold text-ink">{item.title}</div>
                                            <div className="text-xs text-muted">ID: {item.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-ink">{item.category}</div>
                                    <div className="text-xs text-muted">{item.stationId} • {item.mode}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${item.status === ItemStatus.Resolved ? 'bg-gray-100 text-gray-600' : 
                                          item.status === ItemStatus.MatchFound ? 'bg-blue-100 text-blue-800' :
                                          item.status === ItemStatus.Listed ? 'bg-green-100 text-green-800' :
                                          'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {item.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                                    {new Date(item.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2">
                                        <Link href={`/items/${item.id}`} className="text-gray-400 hover:text-brand" title="View Public Page">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        </Link>
                                        
                                        <select 
                                            className="text-xs bg-white border border-gray-300 rounded p-1 text-gray-900"
                                            value={item.status}
                                            onChange={(e) => handleStatusUpdate(item.id, e.target.value)}
                                        >
                                            {Object.values(ItemStatus).map((status) => (
                                                <option key={status} value={status}>{status.replace('_', ' ')}</option>
                                            ))}
                                        </select>
                                        
                                        {item.itemType === 'lost' && item.status === ItemStatus.Reported && (
                                            <button 
                                                onClick={() => handleStatusUpdate(item.id, ItemStatus.MatchFound)}
                                                className="text-xs text-blue-600 hover:text-blue-900 font-bold border border-blue-200 bg-blue-50 px-2 py-1 rounded"
                                            >
                                                Match
                                            </button>
                                        )}
                                        
                                        <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-700">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-ink">Register Found Item</h3>
                    <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-ink">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleAddItem} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-ink mb-1">Item Title</label>
                        <input type="text" required className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-brand focus:border-brand outline-none text-gray-900 font-medium" 
                            placeholder="e.g. Blue Umbrella"
                            value={newItemData.title}
                            onChange={e => setNewItemData({...newItemData, title: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-ink mb-1">Description</label>
                        <textarea required className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-brand focus:border-brand outline-none text-gray-900 font-medium" rows={3}
                            placeholder="Details about the item..."
                            value={newItemData.description}
                            onChange={e => setNewItemData({...newItemData, description: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-ink mb-1">Category</label>
                            <select className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm outline-none text-gray-900 font-medium"
                                value={newItemData.category}
                                onChange={e => setNewItemData({...newItemData, category: e.target.value})}
                            >
                                {Object.values(ItemCategory).map((cat) => (
                                   <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-ink mb-1">Transit Mode</label>
                            <select className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm outline-none text-gray-900 font-medium"
                                value={newItemData.mode}
                                onChange={e => setNewItemData({...newItemData, mode: e.target.value as TransitMode})}
                            >
                                {Object.values(TransitMode).map((mode) => (
                                    <option key={mode} value={mode}>{mode}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-ink mb-1">Station/Location</label>
                        <input type="text" required className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm outline-none text-gray-900 font-medium"
                             placeholder="e.g. Maluri Station"
                             value={newItemData.stationId}
                             onChange={e => setNewItemData({...newItemData, stationId: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-ink mb-1">Upload Image</label>
                        <input type="file" accept="image/*" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand/10 file:text-brand hover:file:bg-brand/20"
                            onChange={handleImageUpload}
                        />
                        {newItemImage && <img src={newItemImage} alt="Preview" className="mt-2 h-20 rounded-lg border" />}
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-full text-sm font-bold text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-5 py-2.5 bg-brand text-white rounded-full text-sm font-bold hover:bg-brand-600">Register Item</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}