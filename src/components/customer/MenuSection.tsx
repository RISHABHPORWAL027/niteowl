'use client';

import React, { useState } from 'react';
import { Search, Star, Plus, Minus, Moon, Zap } from 'lucide-react';
import { useNiteOwlStore } from '@/store/useNiteOwlStore';

export function MenuSection() {
  const {
    menuItems,
    selectedCategory,
    setSelectedCategory,
    cart,
    addToCart,
    updateQuantity,
  } = useNiteOwlStore();

  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'ALL', label: 'All Items' },
    { id: 'MAGGI_NOODLES', label: '🍜 Maggi & Noodles' },
    { id: 'CHAI_COFFEE', label: '☕ Chai & Coffee' },
    { id: 'SANDWICHES_BURGERS', label: '🥪 Sandwiches' },
    { id: 'ROLLS_WRAPS', label: '🌯 Rolls & Wraps' },
    { id: 'QUICK_BITES', label: '🍟 Quick Bites' },
  ];

  const filteredItems = menuItems.filter((item) => {
    const matchesCat =
      selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesQuery =
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const getCartQuantity = (itemId: string) => {
    const found = cart.find((c) => c.menuItemId === itemId);
    return found ? found.quantity : 0;
  };

  return (
    <div className="w-full pb-36 max-w-md mx-auto">
      {/* Search Bar */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center w-full h-11 px-3 bg-white border border-gray-200 rounded-xl text-gray-700 focus-within:border-[#239a4e] shadow-xs transition-colors">
          <Search className="w-4 h-4 text-[#239a4e] shrink-0 mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 'cheese maggi', 'chai', 'cold brew'..."
            className="w-full bg-transparent border-0 outline-none text-xs text-gray-900 placeholder:text-gray-400 min-w-0"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Category Pills (Horizontal Scroll) */}
      <div className="w-full overflow-x-auto no-scrollbar py-2 px-4 flex items-center gap-2">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#239a4e] text-white font-bold shadow-sm shadow-[#239a4e]/20'
                  : 'bg-white text-gray-700 border border-gray-200 hover:text-gray-900 hover:bg-gray-50 shadow-xs'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Late Night Dispatch Callout */}
      <div className="px-4 mt-2">
        <div className="flex items-center justify-between p-2.5 px-3 bg-gradient-to-r from-emerald-50 to-emerald-100/60 border border-emerald-200/80 rounded-xl">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#239a4e] animate-pulse" />
            <span className="text-xs font-bold text-emerald-950">
              Midnight Cravings Dispatch
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-800 bg-white border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
            <Moon className="w-2.5 h-2.5" /> Open till 4 AM
          </span>
        </div>
      </div>

      {/* Menu Item Cards */}
      <div className="px-4 mt-4 space-y-3">
        {filteredItems.map((item) => {
          const qty = getCartQuantity(item.id);

          return (
            <div
              key={item.id}
              className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-xs flex items-start justify-between gap-3 hover:border-[#239a4e]/40 hover:shadow-sm transition-all"
            >
              {/* Left Item Details */}
              <div className="flex-1 min-w-0 pr-1">
                {/* Veg Indicator & Tag */}
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3.5 h-3.5 rounded-sm border border-[#239a4e] flex items-center justify-center p-0.5 bg-white">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#239a4e]" />
                  </div>
                  {item.tag && (
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-[#239a4e] border border-emerald-200 text-[9px] font-bold">
                      {item.tag}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-gray-900 text-sm leading-snug truncate">
                  {item.name}
                </h3>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-extrabold text-[#239a4e]">
                    ₹{item.basePrice}
                  </span>
                  <span className="text-gray-300 text-xs">•</span>
                  <div className="flex items-center gap-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    <span>{item.rating}</span>
                    <Star className="w-2.5 h-2.5 fill-emerald-600 text-emerald-600" />
                  </div>
                  <span className="text-[11px] text-gray-400">
                    ({item.ratingCount})
                  </span>
                </div>

                <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Right Image & Add / Counter CTA */}
              <div className="relative w-24 h-24 shrink-0">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover rounded-xl border border-gray-200 bg-gray-50"
                  loading="lazy"
                />

                {/* Counter / Add Button */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[85%]">
                  {qty === 0 ? (
                    <button
                      onClick={() => addToCart(item)}
                      className="w-full py-1.5 rounded-lg bg-[#239a4e] hover:bg-[#1d8242] text-white font-bold text-xs shadow-md shadow-[#239a4e]/25 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      ADD
                    </button>
                  ) : (
                    <div className="w-full py-1 px-1 rounded-lg bg-white border-2 border-[#239a4e] text-[#239a4e] flex items-center justify-between shadow-xs">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-5 h-5 flex items-center justify-center hover:text-black cursor-pointer font-bold"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-extrabold text-xs text-gray-900">
                        {qty}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-5 h-5 flex items-center justify-center hover:text-black cursor-pointer font-bold"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
