'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, ShoppingBag, Plus, Minus, Trash2, RefreshCw, X, Check, Phone, 
  ArrowRight, User, MapPin, FileText, AlertCircle, ChevronRight, Sparkles, ShieldCheck, Ban, Image as ImageIcon 
} from 'lucide-react';

const WHATSAPP_NUMBER = "201044760160";

const getCategoryVisual = (catName) => {
  const name = catName.trim().toLowerCase();
  if (name.includes('كل')) return { icon: '✨', label: 'الكل' };
  if (name.includes('اعشاب') || name.includes('أعشاب')) return { icon: '🌿', label: 'أعشاب' };
  if (name.includes('خلطات') || name.includes('توابل')) return { icon: '🌶️', label: 'خلطات وتوابل' };
  if (name.includes('مشروبات') || name.includes('شاي') || name.includes('قهوة')) return { icon: '☕', label: 'مشروبات' };
  if (name.includes('بذور') || name.includes('مكملات')) return { icon: '🌾', label: 'بذور ومكملات' };
  if (name.includes('مجفف')) return { icon: '🍋', label: 'مجففات' };
  if (name.includes('متنوعة') || name.includes('متنوعه')) return { icon: '🫙', label: 'بهارات متنوعة' };
  if (name.includes('حلواني') || name.includes('حلوانى')) return { icon: '🍰', label: 'لوازم حلواني' };
  if (name.includes('علاج') || name.includes('خاص')) return { icon: '🍯', label: 'خاصة وعلاجية' };
  if (name.includes('بلدى') || name.includes('بلدي')) return { icon: '🧂', label: 'بهارات بلدي' };
  if (name.includes('زيوت')) return { icon: '🧴', label: 'زيوت طبيعية' };
  if (name.includes('عسل')) return { icon: '🍯', label: 'عسل ومنتجاته' };
  if (name.includes('تمور') || name.includes('ياميش')) return { icon: '🌴', label: 'تمور وياميش' };
  return { icon: '🍃', label: catName };
};

export default function Home() {
  const [data, setData] = useState({ products: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('كل المنتجات');
  
  // Cart State
  const [cart, setCart] = useState([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Modal State
  const [activeModalProduct, setActiveModalProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [modalQty, setModalQty] = useState(1);

  // Image Zoom Lightbox State
  const [zoomedImage, setZoomedImage] = useState(null);

  // Checkout & Review State
  const [currentStep, setCurrentStep] = useState('shop');
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/products');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setData({ products: json.products, categories: json.categories });
    } catch (err) {
      setError(err.message || 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // LocalStorage Cart Sync
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sedra_cart');
      if (saved) {
        setCart(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading cart from storage', e);
    }
    setIsCartLoaded(true);
  }, []);

  useEffect(() => {
    if (isCartLoaded) {
      try {
        localStorage.setItem('sedra_cart', JSON.stringify(cart));
      } catch (e) {
        console.error('Error saving cart to storage', e);
      }
    }
  }, [cart, isCartLoaded]);

  const filteredProducts = useMemo(() => {
    return data.products.filter(item => {
      const matchesCat = selectedCategory === 'كل المنتجات' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(search.trim().toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [data.products, selectedCategory, search]);

  const openProductModal = (product) => {
    setActiveModalProduct(product);
    const firstAvailable = product.variants.find(v => v.available) || product.variants[0] || null;
    setSelectedVariant(firstAvailable);
    setModalQty(1);
  };

  const addToCart = () => {
    if (!activeModalProduct || !selectedVariant || !selectedVariant.available) return;
    const itemKey = `${activeModalProduct.id}_${selectedVariant.weight}`;
    setCart(prev => {
      const exists = prev.find(i => i.key === itemKey);
      if (exists) {
        return prev.map(i => i.key === itemKey ? { ...i, qty: i.qty + modalQty } : i);
      }
      return [...prev, {
        key: itemKey,
        name: activeModalProduct.name,
        category: activeModalProduct.category,
        weight: selectedVariant.weight,
        price: selectedVariant.price,
        qty: modalQty
      }];
    });
    setActiveModalProduct(null);
  };

  const updateCartQty = (key, delta) => {
    setCart(prev => prev.map(item => {
      if (item.key === key) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeCartItem = (key) => {
    setCart(prev => prev.filter(item => item.key !== key));
  };

  const clearEntireCart = () => {
    setCart([]);
    setShowClearConfirm(false);
  };

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0).toFixed(2);
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  const validateForm = () => {
    const errors = {};
    if (!customer.name.trim()) {
      errors.name = 'يرجى إدخال الاسم الكامل';
    }
    const cleanPhone = customer.phone.replace(/\s+/g, '');
    if (!cleanPhone) {
      errors.phone = 'يرجى إدخال رقم الهاتف';
    } else if (!/^01[0125][0-9]{8}$/.test(cleanPhone) && cleanPhone.length < 10) {
      errors.phone = 'يرجى إدخال رقم هاتف صحيح (مثال: 01012345678)';
    }
    if (!customer.address.trim()) {
      errors.address = 'يرجى إدخال العنوان بالتفصيل';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProceedToReview = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setCurrentStep('review');
    }
  };

  const handleSendWhatsAppOrder = () => {
    let message = `🌿 *طلب جديد - عطارة سدرة بدمنهور*\n`;
    message += `═══════════════════\n\n`;
    message += `📋 *بيانات التوصيل:*\n`;
    message += `👤 *الاسم:* ${customer.name.trim()}\n`;
    message += `📱 *الهاتف:* ${customer.phone.trim()}\n`;
    message += `📍 *العنوان:* ${customer.address.trim()}\n`;
    if (customer.notes.trim()) {
      message += `📝 *ملاحظات:* ${customer.notes.trim()}\n`;
    }
    message += `\n📦 *تفاصيل المنتجات:*\n`;
    message += `───────────────────\n`;
    
    cart.forEach((item, index) => {
      const itemTotal = (item.price * item.qty).toFixed(2);
      
      const numMatch = item.weight.match(/\d+(\.\d+)?/);
      let totalWeightStr = item.weight;

      if (numMatch) {
        const unitWeight = parseFloat(numMatch[0]);
        const calculatedTotalWeight = unitWeight * item.qty;
        totalWeightStr = item.weight.replace(numMatch[0], calculatedTotalWeight.toString());
      } else if (item.qty > 1) {
        totalWeightStr = `${item.weight} (عدد ${item.qty})`;
      }

      message += `\n*${index + 1} ◂ ${item.name}*\n`;
      message += `   ⚖️ *الوزن:* ${totalWeightStr}\n`;
      message += `   💵 *السعر:* ${itemTotal} جنيه\n`;
    });

    message += `\n═══════════════════\n`;
    message += `💰 *إجمالي الطلب:* *${totalAmount} جنيه*\n`;
    message += `✨ *الدفع عند الاستلام بعد المعاينة*`;

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen pb-32 text-slate-800 selection:bg-brand-accent selection:text-white bg-[#fbf9f4]">
      {/* Top Logo Banner */}
      <header className="pt-2 pb-0 px-4 max-w-xl mx-auto flex flex-col items-center justify-center">
        <div className="w-full max-w-[340px] sm:max-w-[380px] bg-white rounded-3xl p-1.5 sm:p-2 shadow-xs border border-[#e8e2d5] flex flex-col items-center">
          
          <div className="w-full aspect-[16/10] rounded-2xl overflow-hidden flex items-center justify-center bg-white">
            <img 
              src="/logo.png" 
              alt="عطارة سدرة بدمنهور" 
              className="w-full h-full object-cover"
            />
          </div>
          
          <div 
            style={{
              background: 'linear-gradient(135deg, #173023 0%, #224432 50%, #173023 100%)',
              border: '2px solid #d4af37',
              boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
            }}
            className="w-full mt-2 mb-0.5 py-2 px-3 rounded-2xl flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5 text-[#d4af37] shrink-0 animate-pulse" />
            <span className="text-[15px] sm:text-base font-black text-[#fff4d6] tracking-wide drop-shadow-sm text-center leading-tight">
              ما تدفعش ولا جنيه غير بعد المعاينة
            </span>
            <ShieldCheck className="w-5 h-5 text-[#d4af37] shrink-0" />
          </div>

        </div>
      </header>

      {/* Main Container with Sticky Search & Modern Visual Categories */}
      <main className="max-w-xl mx-auto px-4 mt-2">
        
        {/* Sticky Search & Icon Categories */}
        <div className="sticky top-0 z-30 bg-[#fbf9f4]/98 backdrop-blur-md pt-2 pb-2.5 -mx-4 px-4 border-b border-[#e8e2d5] shadow-xs mb-3">
          {/* Search Bar */}
          <div className="bg-white rounded-2xl shadow-xs p-2 flex items-center gap-2 border border-[#e8e2d5] mb-2.5">
            <Search className="w-4 h-4 text-[#4d7c60] mr-1.5 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن منتج بالاسم..."
              className="w-full bg-transparent focus:outline-none text-xs sm:text-sm font-semibold text-[#1e382b]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Categories Grid */}
          {!loading && !error && data.categories.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2">
              {data.categories.map(cat => {
                const isSelected = selectedCategory === cat;
                const visual = getCategoryVisual(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={
                      isSelected
                        ? {
                            background: 'linear-gradient(135deg, #1b3d2b 0%, #0e2417 100%)',
                            border: '2px solid #d4af37',
                            color: '#fff9ea',
                            boxShadow: '0 4px 10px rgba(212, 175, 55, 0.35)',
                            transform: 'scale(1.02)'
                          }
                        : {
                            background: '#ffffff',
                            border: '1.5px solid #e2d9c8',
                            color: '#1b3828',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
                          }
                    }
                    className="relative px-2 py-1.5 rounded-2xl transition-all duration-200 flex flex-col items-center justify-center min-h-[46px] active:scale-95 text-center group"
                  >
                    {isSelected && (
                      <span 
                        style={{ background: '#d4af37' }} 
                        className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-white animate-ping"
                      ></span>
                    )}
                    
                    <span className="text-base sm:text-lg mb-0.5 leading-none select-none">
                      {visual.icon}
                    </span>
                    
                    <span className={`text-[10px] sm:text-[11px] font-black leading-tight truncate max-w-[95%] ${isSelected ? 'text-[#fff4d6]' : 'text-[#1e382b]'}`}>
                      {cat}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="text-center py-16 text-[#2d533e] font-bold">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-[#c89d56]" />
            جاري تحميل قائمة الأسعار...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-center my-6 shadow-xs">
            <p className="text-xs font-bold mb-2.5">{error}</p>
            <button
              onClick={fetchData}
              className="bg-[#2d533e] text-white text-xs px-3.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 shadow"
            >
              <RefreshCw className="w-3 h-3" /> إعادة المحاولة
            </button>
          </div>
        )}

        {/* Products Grid with Product Images */}
        {!loading && !error && (
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[11px] font-bold text-slate-500">
                {selectedCategory} ({filteredProducts.length} منتج)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  className={`bg-white rounded-2xl p-3 border shadow-2xs flex flex-col justify-between transition ${
                    product.isAvailable
                      ? 'border-[#e8e2d5] hover:shadow-sm'
                      : 'border-slate-200 opacity-65 bg-slate-50/70'
                  }`}
                >
                  <div>
                    {/* Product Image & Category Header */}
                    <div className="flex items-start gap-2 mb-2">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (product.image) setZoomedImage(product.image);
                        }}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-100 border border-[#e8e2d5] overflow-hidden shrink-0 relative group cursor-pointer"
                        title="انقر لتكبير الصورة"
                      >
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%234d7c60' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 bg-[#fbf9f4]">
                            <ImageIcon className="w-6 h-6 text-[#4d7c60]/50" />
                          </div>
                        )}
                        <span className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[9px] font-bold">تكبير</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-[9px] text-[#c89d56] font-bold bg-[#fbf9f4] px-1 py-0.2 rounded border border-[#e8e2d5] truncate max-w-[70%]">
                            {product.category}
                          </span>
                          {!product.isAvailable && (
                            <span className="text-[8px] font-bold text-red-600 bg-red-50 px-1 py-0.2 rounded border border-red-200">
                              غير متوفر
                            </span>
                          )}
                        </div>
                        <h3 
                          onClick={() => product.isAvailable && openProductModal(product)}
                          className="font-bold text-xs sm:text-sm text-[#1e382b] line-clamp-2 leading-snug cursor-pointer hover:text-[#2d533e]"
                        >
                          {product.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div onClick={() => product.isAvailable && openProductModal(product)} className="cursor-pointer">
                    <div className="text-[11px] text-slate-500 font-semibold mb-2.5">
                      {product.variants.map((v, i) => (
                        <div key={i} className="flex justify-between items-center py-0.5 border-t border-slate-50">
                          <span className={!v.available ? 'line-through text-slate-400' : ''}>{v.weight}</span>
                          <span className={`font-bold ${v.available ? 'text-[#2d533e]' : 'text-red-500 text-[10px]'}`}>
                            {v.available ? `${v.price} ج.م` : 'غير متوفر'}
                          </span>
                        </div>
                      ))}
                    </div>
                    {product.isAvailable ? (
                      <button className="w-full bg-[#2d533e] text-white text-xs py-2 rounded-xl font-bold flex items-center justify-center gap-1 shadow-2xs hover:bg-[#1e382b] transition">
                        <Plus className="w-3.5 h-3.5" /> اختيار
                      </button>
                    ) : (
                      <button disabled className="w-full bg-slate-200 text-slate-500 text-xs py-2 rounded-xl font-bold flex items-center justify-center gap-1 cursor-not-allowed">
                        <Ban className="w-3 h-3" /> غير متوفر
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
          <div className="text-center py-14 text-slate-400 font-bold text-xs">
            لا توجد منتجات مطابقة لعملية البحث
          </div>
        )}
      </main>

      {/* Image Zoom Lightbox Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 bg-black/80 z-70 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-lg w-full bg-white rounded-3xl p-3 shadow-2xl overflow-hidden flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setZoomedImage(null)} 
              className="absolute top-4 left-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center">
              <img src={zoomedImage} alt="صورة المنتج" className="w-full h-full object-contain" />
            </div>
            <p className="text-xs font-bold text-slate-600 mt-3">انقر في أي مكان للإغلاق</p>
          </div>
        </div>
      )}

      {/* Floating Bottom Cart Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-[#e8e2d5] z-30 shadow-md">
        <div className="max-w-xl mx-auto flex items-center gap-2">
          <button
            onClick={() => {
              setCurrentStep('cart');
              setIsCartOpen(true);
            }}
            className="w-full bg-[#1e382b] text-white p-3 rounded-2xl font-bold flex items-center justify-between shadow-md active:scale-[0.99] transition"
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <ShoppingBag className="w-5 h-5 text-[#c89d56]" />
                {totalItemsCount > 0 && (
                  <span className="absolute -top-2.5 -right-2.5 bg-[#c89d56] text-white text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-black">
                    {totalItemsCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold">سلة الطلبات</span>
            </div>
            <span className="text-xs text-[#c89d56] font-black">{totalAmount} جنيه</span>
          </button>
        </div>
      </div>

      {/* Product Selection Modal */}
      {activeModalProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                {activeModalProduct.image && (
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border overflow-hidden shrink-0">
                    <img src={activeModalProduct.image} alt={activeModalProduct.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-bold text-[#c89d56]">{activeModalProduct.category}</span>
                  <h2 className="text-base font-black text-[#1e382b]">{activeModalProduct.name}</h2>
                </div>
              </div>
              <button onClick={() => setActiveModalProduct(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-3.5">
              <label className="text-xs font-bold text-slate-600 block mb-1.5">الأوزان المتاحة:</label>
              <div className="grid grid-cols-2 gap-2">
                {activeModalProduct.variants.map((variant, idx) => (
                  <button
                    key={idx}
                    disabled={!variant.available}
                    onClick={() => setSelectedVariant(variant)}
                    className={`p-2.5 rounded-xl border text-right transition ${
                      !variant.available 
                        ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                        : selectedVariant?.weight === variant.weight
                          ? 'border-[#2d533e] bg-[#2d533e]/5 text-[#1e382b] font-bold ring-2 ring-[#2d533e]/20'
                          : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold">{variant.weight}</span>
                      {!variant.available && <span className="text-[9px] text-red-500 font-bold">غير متوفر</span>}
                    </div>
                    <div className="text-xs font-black text-[#2d533e] mt-0.5">
                      {variant.available ? `${variant.price} ج.م` : 'غير متوفر'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mb-5 bg-[#fbf9f4] p-3 rounded-xl border border-[#e8e2d5]">
              <span className="text-xs font-bold text-slate-700">الكمية المطلوبة:</span>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                  className="w-7 h-7 rounded-lg bg-white border border-[#e8e2d5] flex items-center justify-center font-bold text-[#1e382b] shadow-2xs"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-bold text-sm text-[#1e382b] w-5 text-center">{modalQty}</span>
                <button
                  onClick={() => setModalQty(modalQty + 1)}
                  className="w-7 h-7 rounded-lg bg-white border border-[#e8e2d5] flex items-center justify-center font-bold text-[#1e382b] shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <button
              disabled={!selectedVariant || !selectedVariant.available}
              onClick={addToCart}
              className="w-full bg-[#2d533e] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-xs shadow-md hover:bg-[#1e382b] transition"
            >
              {selectedVariant?.available 
                ? `إضافة للسلة — ${((selectedVariant?.price || 0) * modalQty).toFixed(2)} ج.م` 
                : 'هذا الوزن غير متوفر حالياً'}
            </button>
          </div>
        </div>
      )}

      {/* Cart & Checkout Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md h-[88vh] rounded-t-[2rem] sm:rounded-2xl p-4 shadow-2xl flex flex-col justify-between">
            
            {/* Header of Drawer */}
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  {currentStep !== 'cart' && (
                    <button 
                      onClick={() => setCurrentStep(currentStep === 'review' ? 'checkout' : 'cart')} 
                      className="p-1 text-slate-500 hover:text-[#1e382b] ml-1"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                  <h2 className="text-sm font-black text-[#1e382b]">
                    {currentStep === 'cart' && 'سلة المشتريات'}
                    {currentStep === 'checkout' && 'بيانات توصيل الطلب'}
                    {currentStep === 'review' && 'مراجعة الطلب قبل الإرسال'}
                  </h2>
                </div>

                <div className="flex items-center gap-1.5">
                  {currentStep === 'cart' && cart.length > 0 && (
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="text-[10px] font-bold text-red-600 hover:text-red-700 px-2 py-0.5 bg-red-50 rounded-lg border border-red-100"
                    >
                      مسح السلة
                    </button>
                  )}
                  <button onClick={() => setIsCartOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Step 1: Cart Items */}
              {currentStep === 'cart' && (
                <div className="overflow-y-auto max-h-[56vh] py-2.5 divide-y divide-slate-100">
                  {cart.length === 0 ? (
                    <div className="text-center py-14 text-slate-400 font-bold text-xs">
                      السلة فارغة حالياً
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.key} className="py-2.5 flex justify-between items-center gap-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-xs text-[#1e382b] leading-snug">{item.name}</h4>
                          <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                            {item.weight} — <span className="text-[#2d533e] font-bold">{item.price} ج.م</span>
                          </div>
                          <div className="text-[10px] text-[#c89d56] font-bold mt-0.5">
                            الإجمالي: {(item.price * item.qty).toFixed(2)} ج.م
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => updateCartQty(item.key, -1)}
                            className="w-6.5 h-6.5 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-700 font-bold"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-black w-4 text-center text-[#1e382b]">{item.qty}</span>
                          <button
                            onClick={() => updateCartQty(item.key, 1)}
                            className="w-6.5 h-6.5 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-700 font-bold"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeCartItem(item.key)}
                            className="w-6.5 h-6.5 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center text-red-500 mr-1"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Step 2: Customer Checkout Form */}
              {currentStep === 'checkout' && (
                <form id="checkout-form" onSubmit={handleProceedToReview} className="overflow-y-auto max-h-[58vh] py-2.5 space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                      <User className="w-3 h-3 text-[#2d533e]" />
                      الاسم الكامل <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      placeholder="أدخل اسمك بالكامل"
                      className={`w-full p-2 text-xs font-semibold rounded-xl border ${
                        formErrors.name ? 'border-red-500 bg-red-50/50' : 'border-slate-200 focus:border-[#2d533e]'
                      } outline-none`}
                    />
                    {formErrors.name && <span className="text-[10px] text-red-500 font-bold mt-0.5 block">{formErrors.name}</span>}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-[#2d533e]" />
                      رقم الهاتف <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      placeholder="01012345678"
                      className={`w-full p-2 text-xs font-semibold rounded-xl border text-right ${
                        formErrors.phone ? 'border-red-500 bg-red-50/50' : 'border-slate-200 focus:border-[#2d533e]'
                      } outline-none`}
                    />
                    {formErrors.phone && <span className="text-[10px] text-red-500 font-bold mt-0.5 block">{formErrors.phone}</span>}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#2d533e]" />
                      العنوان بالتفصيل <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={customer.address}
                      onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                      placeholder="المحافظة - المدينة - المنطقة - الشارع - رقم المنزل"
                      className={`w-full p-2 text-xs font-semibold rounded-xl border ${
                        formErrors.address ? 'border-red-500 bg-red-50/50' : 'border-slate-200 focus:border-[#2d533e]'
                      } outline-none resize-none`}
                    />
                    {formErrors.address && <span className="text-[10px] text-red-500 font-bold mt-0.5 block">{formErrors.address}</span>}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-[#2d533e]" />
                      ملاحظات على الطلب (اختياري)
                    </label>
                    <textarea
                      rows={2}
                      value={customer.notes}
                      onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                      placeholder="مثال: اتصل بي قبل التوصيل، بدون طحن، طحن ناعم..."
                      className="w-full p-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-[#2d533e] outline-none resize-none"
                    />
                  </div>
                </form>
              )}

              {/* Step 3: Order Review */}
              {currentStep === 'review' && (
                <div className="overflow-y-auto max-h-[58vh] py-2.5 space-y-3">
                  <div className="bg-[#fbf9f4] p-3 rounded-xl border border-[#e8e2d5]">
                    <h4 className="text-xs font-black text-[#1e382b] mb-1.5 pb-1 border-b border-[#e8e2d5]">
                      بيانات العميل والتوصيل:
                    </h4>
                    <div className="text-[11px] space-y-1 text-slate-700">
                      <div><strong className="text-[#1e382b]">الاسم:</strong> {customer.name}</div>
                      <div><strong className="text-[#1e382b]">الهاتف:</strong> {customer.phone}</div>
                      <div><strong className="text-[#1e382b]">العنوان:</strong> {customer.address}</div>
                      {customer.notes && (
                        <div><strong className="text-[#1e382b]">الملاحظات:</strong> {customer.notes}</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-black text-[#1e382b] mb-1.5 pb-1 border-b border-slate-100">
                      المنتجات المطلوبة:
                    </h4>
                    <div className="space-y-1.5 divide-y divide-slate-50">
                      {cart.map((item, idx) => (
                        <div key={idx} className="pt-1.5 first:pt-0 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-[#1e382b]">{item.name}</span>
                            <span className="text-[10px] text-slate-500 block">
                              {item.weight} × {item.qty} ({item.price} ج.م)
                            </span>
                          </div>
                          <span className="font-black text-[#2d533e]">
                            {(item.price * item.qty).toFixed(2)} ج.م
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2.5 border-t border-slate-100 space-y-2">
              <div className="flex justify-between items-center font-bold text-xs pb-0.5">
                <span className="text-slate-600">الإجمالي النهائي:</span>
                <span className="text-[#2d533e] text-base font-black">{totalAmount} جنيه</span>
              </div>

              {currentStep === 'cart' && (
                <button
                  disabled={cart.length === 0}
                  onClick={() => setCurrentStep('checkout')}
                  className="w-full bg-[#2d533e] disabled:opacity-50 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:bg-[#1e382b] transition"
                >
                  <span>متابعة إتمام الطلب</span>
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                </button>
              )}

              {currentStep === 'checkout' && (
                <button
                  form="checkout-form"
                  type="submit"
                  className="w-full bg-[#2d533e] text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:bg-[#1e382b] transition"
                >
                  <span>مراجعة الطلب قبل الإرسال</span>
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                </button>
              )}

              {currentStep === 'review' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentStep('checkout')}
                    className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold text-xs hover:bg-slate-200 transition"
                  >
                    تعديل الطلب
                  </button>
                  <button
                    onClick={handleSendWhatsAppOrder}
                    className="flex-[2] bg-[#25D366] text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:bg-[#1ebd5a] transition"
                  >
                    <Phone className="w-3.5 h-3.5 fill-white" />
                    <span>إرسال الطلب عبر واتساب</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Clear Cart Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/70 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-4 max-w-xs w-full text-center shadow-2xl animate-in zoom-in-95">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-1.5" />
            <h3 className="font-black text-xs text-[#1e382b] mb-1">تأكيد مسح السلة</h3>
            <p className="text-[11px] text-slate-500 mb-3">هل أنت متأكد من رغبتك في حذف جميع المنتجات من السلة؟</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={clearEntireCart}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white font-bold text-xs shadow-2xs hover:bg-red-700"
              >
                نعم، امسح
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
