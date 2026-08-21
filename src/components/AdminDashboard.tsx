import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, ToggleLeft, ToggleRight, DollarSign, Package, Clock, CheckCircle2, AlertCircle, Edit, Trash2, RefreshCw, X, ChefHat, Filter } from 'lucide-react';
import { MenuItem, Category, Order, OrderStatus } from '../types';

interface AdminDashboardProps {
  categories: Category[];
  menuItems: MenuItem[];
  onRefreshMenu: () => void;
  isChatEnabled?: boolean;
  onToggleChatEnabled?: (enabled: boolean) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  categories,
  menuItems,
  onRefreshMenu,
  isChatEnabled = true,
  onToggleChatEnabled,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(() => sessionStorage.getItem('fids_admin_token'));

  // Helper: attach the admin token to a fetch call, and log out if the session has expired
  const adminFetch = async (input: string, init: RequestInit = {}) => {
    const res = await fetch(input, {
      ...init,
      headers: {
        ...(init.headers || {}),
        ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
      },
    });
    if (res.status === 401) {
      sessionStorage.removeItem('fids_admin_token');
      setAdminToken(null);
      setIsAuthenticated(false);
      setAuthError('Your session expired. Please log in again.');
    }
    return res;
  };

  const [activeTab, setActiveTab] = useState<'orders' | 'inventory'>('orders');
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [selectedOrderStatusFilter, setSelectedOrderStatusFilter] = useState<string>('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // New Menu Item Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCat, setNewItemCat] = useState(categories[0]?.id || 'cat-mains');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemVeg, setNewItemVeg] = useState(true);
  const [newItemImage, setNewItemImage] = useState('');
  const [newItemSpice, setNewItemSpice] = useState<'Mild' | 'Medium' | 'Spicy'>('Medium');

  // Edit price modal
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editPriceVal, setEditPriceVal] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey: passkeyInput }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        sessionStorage.setItem('fids_admin_token', data.token);
        setAdminToken(data.token);
        setIsAuthenticated(true);
        setPasskeyInput('');
      } else {
        setAuthError(data.error || 'Invalid admin passkey.');
      }
    } catch (err) {
      setAuthError('Could not reach the server. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await adminFetch('/api/admin/logout', { method: 'POST' });
    } catch (err) {
      // ignore network errors on logout
    }
    sessionStorage.removeItem('fids_admin_token');
    setAdminToken(null);
    setIsAuthenticated(false);
  };

  const fetchOrders = async () => {
    setIsRefreshing(true);
    try {
      const res = await adminFetch('/api/orders');
      const data = await res.json();
      if (data.success && data.orders) {
        setOrdersList(data.orders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // On mount: if a token is already stored, treat the session as active
  // (a stale/expired token will simply 401 on the first real request and log back out).
  useEffect(() => {
    if (adminToken) {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  // Toggle In Stock / Out of Stock
  const handleToggleStock = async (item: MenuItem) => {
    try {
      const updatedStock = !item.is_available;
      const res = await adminFetch(`/api/menu/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: updatedStock })
      });
      const data = await res.json();
      if (data.success) {
        onRefreshMenu();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Order Status
  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus, prepTime?: number) => {
    try {
      const res = await adminFetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          estimated_prep_time: prepTime,
          note: `Admin set status to ${status}`
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add new menu item
  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;

    try {
      const res = await adminFetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItemName,
          category_id: newItemCat,
          price: Number(newItemPrice),
          description: newItemDesc,
          is_veg: newItemVeg,
          image_url: newItemImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
          spice_level: newItemSpice,
          tags: ['Chef Special']
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewItemName('');
        setNewItemPrice('');
        setNewItemDesc('');
        setNewItemImage('');
        onRefreshMenu();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save edited price
  const handleSavePrice = async () => {
    if (!editingItem || !editPriceVal) return;
    try {
      const res = await adminFetch(`/api/menu/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: Number(editPriceVal) })
      });
      const data = await res.json();
      if (data.success) {
        setEditingItem(null);
        onRefreshMenu();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Analytics Metrics
  const totalRevenue = ordersList.reduce((sum, o) => sum + (o.payment_status === 'Paid' ? o.total_amount : 0), 0);
  const activeOrdersCount = ordersList.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length;
  const inStockCount = menuItems.filter(i => i.is_available).length;
  const outOfStockCount = menuItems.length - inStockCount;

  // Filtered orders list
  const filteredOrders = selectedOrderStatusFilter === 'All'
    ? ordersList
    : ordersList.filter(o => o.status === selectedOrderStatusFilter);

  // Authentication Gate
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-stone-200 shadow-xl text-stone-900 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500 text-stone-950 font-black flex items-center justify-center text-2xl shadow-lg">
            🔐
          </div>
          <h2 className="text-2xl font-extrabold">Restaurant Admin Portal</h2>
          <p className="text-xs text-stone-500">Secure access for kitchen staff &amp; inventory managers</p>
        </div>

        {authError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
              Admin Passkey
            </label>
            <input
              type="password"
              placeholder="Enter admin passkey"
              value={passkeyInput}
              onChange={(e) => setPasskeyInput(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3.5 rounded-xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-500 shadow-lg shadow-amber-600/20 transition-colors disabled:opacity-60"
          >
            {isLoggingIn ? 'Checking…' : 'Authenticate & Enter Dashboard'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header Bar */}
      <div className="bg-stone-900 text-white p-6 sm:p-8 rounded-3xl border border-stone-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-500" />
            <h1 className="text-2xl font-extrabold tracking-tight">Admin Management Hub</h1>
          </div>
          <p className="text-xs text-stone-400 mt-1">Manage kitchen queue, live order statuses, and menu stock availability</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchOrders(); onRefreshMenu(); }}
            className="p-2.5 rounded-xl bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 transition-colors flex items-center gap-1 text-xs font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>

          <button
            onClick={handleLogout}
            className="px-4 py-2.5 rounded-xl bg-rose-600/20 text-rose-300 border border-rose-500/30 text-xs font-bold hover:bg-rose-600/30"
          >
            Exit Portal
          </button>
        </div>
      </div>

      {/* AI Chatbot Visibility & Sharing Control Card */}
      <div className="bg-stone-900 border border-stone-800 p-6 rounded-3xl text-stone-100 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl font-bold">
              🤖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">AI Culinary Chatbot (FidsBot)</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  isChatEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {isChatEnabled ? 'VISIBLE TO VISITORS' : 'HIDDEN FROM VISITORS'}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">Control whether website visitors see or can open the AI chat widget</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-stone-300">
              {isChatEnabled ? 'AI Chat Enabled' : 'AI Chat Disabled'}
            </span>
            <button
              onClick={() => onToggleChatEnabled && onToggleChatEnabled(!isChatEnabled)}
              className="p-1 rounded-full transition-colors focus:outline-none"
              title="Toggle AI Chatbot Visibility for Visitors"
            >
              {isChatEnabled ? (
                <ToggleRight className="w-10 h-10 text-amber-400" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-stone-600" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-stone-300 bg-stone-950 p-4 rounded-2xl border border-stone-800/80">
          <div className="space-y-1">
            <div className="font-bold text-amber-400">🔗 How to share your website without AI Chat:</div>
            <p className="text-stone-400 text-[11px]">
              You can turn OFF the AI Chatbot switch above, OR share your website URL with <code className="bg-stone-900 text-amber-300 px-1.5 py-0.5 rounded font-mono border border-stone-800">?chat=false</code> appended to automatically hide the chat for anyone opening that link!
            </p>
          </div>
          <button
            onClick={() => {
              const noChatUrl = window.location.origin + window.location.pathname + '?chat=false';
              navigator.clipboard.writeText(noChatUrl);
              alert('Copied link without chat to clipboard:\n' + noChatUrl);
            }}
            className="px-3.5 py-2 rounded-xl bg-amber-500/20 text-amber-300 font-bold hover:bg-amber-500/30 border border-amber-500/30 shrink-0 transition-colors"
          >
            Copy No-Chat Website Link
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between text-stone-400 text-xs font-bold uppercase">
            <span>Total Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900 mt-2">₹{totalRevenue}</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">Paid customer orders</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between text-stone-400 text-xs font-bold uppercase">
            <span>Active Orders</span>
            <ChefHat className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900 mt-2">{activeOrdersCount}</div>
          <div className="text-[10px] text-amber-600 font-semibold mt-1">In kitchen queue</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between text-stone-400 text-xs font-bold uppercase">
            <span>In-Stock Menu</span>
            <Package className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900 mt-2">{inStockCount} / {menuItems.length}</div>
          <div className="text-[10px] text-stone-500 font-semibold mt-1">{outOfStockCount} Out of Stock</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between text-stone-400 text-xs font-bold uppercase">
            <span>Avg Kitchen Prep</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900 mt-2">20 Mins</div>
          <div className="text-[10px] text-stone-500 font-semibold mt-1">Target fulfillment</div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden space-y-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'orders'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              🔥 Live Order Queue ({ordersList.length})
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'inventory'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              📦 Inventory &amp; Stock Control ({menuItems.length})
            </button>
          </div>

          {activeTab === 'inventory' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-stone-900 text-amber-400 font-bold text-xs hover:bg-stone-800 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Dish</span>
            </button>
          )}
        </div>

        {/* TAB 1: ORDERS QUEUE */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Filter buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs font-semibold">
              <span className="text-stone-400">Filter Status:</span>
              {['All', 'Pending', 'Preparing', 'Ready', 'Delivered'].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedOrderStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg border transition-colors ${
                    selectedOrderStatusFilter === st
                      ? 'bg-stone-900 text-amber-400 border-stone-900'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-stone-400 text-xs">No orders match this status filter.</div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-4 hover:border-amber-400/50 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/60 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-stone-900 text-base">Order #{ord.id}</span>
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                            ord.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                            ord.status === 'Preparing' ? 'bg-blue-100 text-blue-800' :
                            ord.status === 'Ready' ? 'bg-purple-100 text-purple-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {ord.status}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Customer: <strong className="text-stone-800">{ord.customer_name}</strong> ({ord.customer_phone}) • {ord.delivery_type.toUpperCase()}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-lg font-extrabold text-amber-600">₹{ord.total_amount}</span>
                        <span className="block text-[10px] text-stone-400 font-medium">{ord.payment_method} ({ord.payment_status})</span>
                      </div>
                    </div>

                    {/* Items list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="p-2.5 bg-white rounded-xl border border-stone-200 flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${it.is_veg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span className="font-bold text-stone-800">{it.name}</span>
                            <span className="text-stone-400">x{it.quantity}</span>
                          </div>
                          <span className="font-bold text-stone-700">₹{it.price * it.quantity}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action Controls for Staff */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/60 text-xs">
                      <div className="text-stone-500">
                        <span>Prep Estimate: </span>
                        <strong className="text-stone-800">{ord.estimated_prep_time} Mins</strong>
                      </div>

                      <div className="flex items-center gap-2">
                        {ord.status === 'Pending' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(ord.id, 'Preparing', 20)}
                            className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-sm"
                          >
                            Accept &amp; Start Preparing
                          </button>
                        )}
                        {ord.status === 'Preparing' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(ord.id, 'Ready')}
                            className="px-3.5 py-1.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-500 shadow-sm"
                          >
                            Mark as Food Ready
                          </button>
                        )}
                        {ord.status === 'Ready' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(ord.id, 'Out for Delivery')}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-500 shadow-sm"
                          >
                            Dispatch Order
                          </button>
                        )}
                        {ord.status === 'Out for Delivery' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(ord.id, 'Delivered')}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow-sm"
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INVENTORY & STOCK CONTROL */}
        {activeTab === 'inventory' && (
          <div className="space-y-4 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400 text-xs uppercase tracking-wider font-bold">
                  <th className="py-3 px-2">Dish</th>
                  <th className="py-3 px-2">Category</th>
                  <th className="py-3 px-2">Price</th>
                  <th className="py-3 px-2">Type</th>
                  <th className="py-3 px-2 text-center">Stock Availability</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {menuItems.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-2 font-bold text-stone-900 flex items-center gap-3">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <span>{item.name}</span>
                        <span className="block text-[10px] text-stone-400 font-normal line-clamp-1">{item.description}</span>
                      </div>
                    </td>

                    <td className="py-3 px-2 text-stone-600 font-medium">
                      {categories.find(c => c.id === item.category_id)?.name || 'General'}
                    </td>

                    <td className="py-3 px-2 font-extrabold text-stone-900">
                      ₹{item.price}
                    </td>

                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase ${
                        item.is_veg ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}>
                        {item.is_veg ? 'VEG' : 'NON-VEG'}
                      </span>
                    </td>

                    <td className="py-3 px-2 text-center">
                      <button
                        onClick={() => handleToggleStock(item)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-[11px] transition-all ${
                          item.is_available
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                        title="Click to toggle availability"
                      >
                        {item.is_available ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-rose-600" />}
                        <span>{item.is_available ? 'In Stock' : 'Out of Stock'}</span>
                      </button>
                    </td>

                    <td className="py-3 px-2 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setEditPriceVal(String(item.price));
                        }}
                        className="p-1.5 text-stone-500 hover:text-stone-900 bg-stone-100 rounded-lg"
                        title="Edit Price"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add New Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 text-base">Add New Menu Dish</h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMenuItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-600 mb-1">Dish Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Malai Kofta Curry"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-stone-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-600 mb-1">Category *</label>
                  <select
                    value={newItemCat}
                    onChange={(e) => setNewItemCat(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-stone-800 focus:outline-none focus:border-amber-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-600 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="350"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-stone-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-600 mb-1">Description</label>
                <textarea
                  placeholder="Cottage cheese and potato dumplings in creamy cashew gravy..."
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-stone-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-600 mb-1">Dietary Type</label>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setNewItemVeg(true)}
                      className={`flex-1 py-2 rounded-xl font-bold border ${
                        newItemVeg ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-stone-50 border-stone-200 text-stone-600'
                      }`}
                    >
                      Veg
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewItemVeg(false)}
                      className={`flex-1 py-2 rounded-xl font-bold border ${
                        !newItemVeg ? 'bg-rose-100 border-rose-500 text-rose-800' : 'bg-stone-50 border-stone-200 text-stone-600'
                      }`}
                    >
                      Non-Veg
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-600 mb-1">Spice Level</label>
                  <select
                    value={newItemSpice}
                    onChange={(e) => setNewItemSpice(e.target.value as any)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-stone-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Mild">Mild</option>
                    <option value="Medium">Medium</option>
                    <option value="Spicy">Spicy</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-600 mb-1">Image URL</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={newItemImage}
                  onChange={(e) => setNewItemImage(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-stone-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 font-bold hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-500 shadow-md shadow-amber-600/20"
                >
                  Save to Menu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Price Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-stone-200 text-stone-900">
            <h3 className="font-bold text-sm">Update Price for {editingItem.name}</h3>

            <div>
              <label className="block text-xs text-stone-500 mb-1">New Price (₹)</label>
              <input
                type="number"
                value={editPriceVal}
                onChange={(e) => setEditPriceVal(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-sm font-bold text-stone-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl text-stone-600 text-xs font-bold hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePrice}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-500"
              >
                Save Price
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
