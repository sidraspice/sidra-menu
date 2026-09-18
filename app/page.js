'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, ShoppingBag, Plus, Minus, Trash2, RefreshCw, X, Check, Phone, 
  User, MapPin, FileText, AlertCircle, ChevronRight, ChevronDown, Sparkles, ShieldCheck, Ban, Image as ImageIcon, Share2, RotateCcw, Package
} from 'lucide-react';

const WHATSAPP_NUMBER = "201044760160";
const EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;
const FREE_DELIVERY_THRESHOLD = 500;

const triggerVibration = () => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(50);
  }
};

const getCategoryVisual = (catName) => {
  const name = catName.trim().toLowerCase();
  if (name.includes('كل')) return { icon: '✨', label: 'الكل' };
  if (name.includes('فرص') || name.includes('خاصة') || name.includes('عروض') || name.includes('خصم')) return { icon: '🔥', label: 'فرص خاصة' };
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

const getWeightNumberInGrams = (weightStr) => {
  if (!weightStr) return 1;
  const str = weightStr.toString().toLowerCase();
  const match = str.match(/\d+(\.\d+)?/);
  let num = match ? parseFloat(match[0]) : 1;
  if (str.includes('كيلو') || str.includes('كجم') || str.includes('kg')) num = num * 1000;
  return num;
};

const getCalculatedTotalWeight = (weightStr, qty) => {
  if (!weightStr) return '';
  const str = weightStr.toString();
  const numMatch = str.match(/\d+(\.\d+)?/);
  
  if (numMatch) {
    const isKilo = str.includes('كيلو') || str.includes('كجم') || str.includes('kg');
    let unitWeight = parseFloat(numMatch[0]);
    if (isKilo) unitWeight *= 1000;
    
    const totalGrams = unitWeight * qty;
    
    if (totalGrams >= 1000 && totalGrams % 1000 === 0) return `${totalGrams / 1000} كيلو`;
    if (totalGrams >= 1000) return `${(totalGrams / 1000).toFixed(2).replace(/\.00$/, '')} كيلو`;
    return `${totalGrams} جرام`;
  } else if (qty > 1) {
    return `${str} (عدد ${qty})`;
  }
  
  return str;
};

const isOfferValid = (price, originalPrice) => {
  return originalPrice != null && parseFloat(originalPrice) > parseFloat(price);
};

export default function Home() {
  const [data, setData] = useState({ products: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('كل المنتجات');
  
  const [cart, setCart] = useState([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [flyingItems, setFlyingItems] = useState([]);
  const cartIconRef = useRef(null);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [confettiFired, setConfettiFired] = useState(false);

  const [lastOrder, setLastOrder] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const [activeModalProduct, setActiveModalProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [modalQty, setModalQty] = useState(1);
  const [isCustomWeight, setIsCustomWeight] = useState(false);
  const [customWeightValue, setCustomWeightValue] = useState('');
  
  const [grindOption, setGrindOption] = useState('');

  const [zoomedImage, setZoomedImage] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const toastTimeoutRef = useRef(null);

  const [currentStep, setCurrentStep] = useState('shop');
  const [customer, setCustomer] = useState({ name: '', phone: '', deliveryZone: '', address: '', notes: '' });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const isAnyModalOpen = isCartOpen || activeModalProduct || zoomedImage || showClearConfirm || showRestoreConfirm || showWelcomeBack;
    const handlePopState = () => {
      if (isCartOpen) setIsCartOpen(false);
      if (activeModalProduct) setActiveModalProduct(null);
      if (zoomedImage) setZoomedImage(null);
      if (showClearConfirm) setShowClearConfirm(false);
      if (showRestoreConfirm) setShowRestoreConfirm(false);
      if (showWelcomeBack) setShowWelcomeBack(false);
    };
    if (isAnyModalOpen) {
      window.history.pushState({ modal: true }, '');
      window.addEventListener('popstate', handlePopState);
    }
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isCartOpen, activeModalProduct, zoomedImage, showClearConfirm, showRestoreConfirm, showWelcomeBack]);

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

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('sedra_cart');
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        setCart(parsedCart);
        if (parsedCart.length > 0 && !sessionStorage.getItem('sedra_greeted')) {
          setShowWelcomeBack(true);
          sessionStorage.setItem('sedra_greeted', 'true');
        }
      }
    } catch (e) { console.error(e); }
    setIsCartLoaded(true);

    const checkLastOrder = () => {
      try {
        const savedOrder = localStorage.getItem('sedra_last_order');
        if (savedOrder) {
          const parsed = JSON.parse(savedOrder);
          if (Date.now() < parsed.expiresAt) setLastOrder(parsed);
          else { localStorage.removeItem('sedra_last_order'); setLastOrder(null); setIsEditing(false); }
        }
      } catch (e) { console.error(e); }
    };
    checkLastOrder();
  }, []);

  useEffect(() => {
    if (isCartLoaded) {
      try { localStorage.setItem('sedra_cart', JSON.stringify(cart)); } catch (e) { console.error(e); }
    }
  }, [cart, isCartLoaded]);

  useEffect(() => {
    try {
      const savedCustomer = localStorage.getItem('sedra_customer');
      if (savedCustomer) {
        const parsed = JSON.parse(savedCustomer);
        setCustomer({ 
          name: parsed.name || '', 
          phone: parsed.phone || '', 
          deliveryZone: parsed.deliveryZone || '', 
          address: parsed.address || '', 
          notes: '' 
        });
      }
    } catch (e) { console.error(e); }
  }, []);

  const handleShareProduct = (product, e) => {
    e.stopPropagation();
    const shareText = `🌿 شاهد هذا المنتج الرائع من عطارة سدرة:\n*${product.name}*\nاطلبه الآن من المنيو الإلكتروني!`;
    if (navigator.share) {
      navigator.share({ title: product.name, text: shareText, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setToast({ visible: true, message: 'تم نسخ رابط المنيو بنجاح' });
      setTimeout(() => setToast({ visible: false, message: '' }), 2500);
    }
  };

  const displayCategories = useMemo(() => {
    if (!data.categories || data.categories.length === 0) return [];
    const originalCats = data.categories.filter(c => c !== 'كل المنتجات' && !c.includes('خصم') && !c.includes('عروض') && !c.includes('فرص'));
    return ['كل المنتجات', 'فرص خاصة', ...originalCats];
  }, [data.categories]);

  const filteredProducts = useMemo(() => {
    return data.products.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.trim().toLowerCase());
      if (selectedCategory === 'فرص خاصة') {
        return item.variants.some(v => isOfferValid(v.price, v.originalPrice)) && matchesSearch;
      }
      return (selectedCategory === 'كل المنتجات' || item.category === selectedCategory) && matchesSearch;
    });
  }, [data.products, selectedCategory, search]);

  const openProductModal = (product) => {
    const rawGrindData = product.grindOptions || product['حالة المنتج'] || product['حالة المنتج '] || product['حالة الطحن'] || product['حالة الطحن '] || '';
    let parsedOptions = [];
    if (rawGrindData && typeof rawGrindData === 'string') {
      parsedOptions = rawGrindData.split('|').map(s => s.trim()).filter(Boolean);
    }

    setActiveModalProduct({ ...product, parsedGrindOptions: parsedOptions });
    setSelectedVariant(product.variants.find(v => v.available) || product.variants[0] || null);
    setModalQty(1);
    setIsCustomWeight(false);
    setCustomWeightValue('');
    
    setGrindOption(parsedOptions.length > 0 ? parsedOptions[0] : '');
  };

  const getCalculatedPrice = () => {
    if (!selectedVariant) return 0;
    if (!isCustomWeight) return selectedVariant.price;
    const baseWeightGrams = getWeightNumberInGrams(selectedVariant.weight);
    return parseFloat(((selectedVariant.price / baseWeightGrams) * (parseFloat(customWeightValue) || 0)).toFixed(2));
  };

  const getCalculatedOriginalPrice = () => {
    if (!selectedVariant || !isOfferValid(selectedVariant.price, selectedVariant.originalPrice)) return null;
    if (!isCustomWeight) return selectedVariant.originalPrice;
    const baseWeightGrams = getWeightNumberInGrams(selectedVariant.weight);
    return parseFloat(((selectedVariant.originalPrice / baseWeightGrams) * (parseFloat(customWeightValue) || 0)).toFixed(2));
  };

  const triggerFlyingAnimation = (e, imgUrl) => {
    if (!e || !cartIconRef.current) return;
    const rect = cartIconRef.current.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setFlyingItems(prev => [...prev, { id, startX: e.clientX, startY: e.clientY, endX: rect.left + rect.width / 2, endY: rect.top + rect.height / 2, img: imgUrl }]);
    setTimeout(() => {
      setFlyingItems(prev => prev.filter(item => item.id !== id));
      triggerVibration();
    }, 800);
  };

  const addToCart = (e) => {
    if (!activeModalProduct || !selectedVariant || !selectedVariant.available) return;
    triggerVibration(); 
    triggerFlyingAnimation(e, activeModalProduct.image || '/logo.png');

    let finalWeight = selectedVariant.weight;
    let finalPrice = selectedVariant.price;
    let finalOriginalPrice = isOfferValid(selectedVariant.price, selectedVariant.originalPrice) ? selectedVariant.originalPrice : null;

    if (isCustomWeight) {
      const parsedWeight = parseFloat(customWeightValue);
      if (!parsedWeight || parsedWeight <= 0) return;
      finalWeight = `${parsedWeight} جرام`;
      finalPrice = getCalculatedPrice();
      finalOriginalPrice = getCalculatedOriginalPrice();
    }

    const finalName = grindOption ? `${activeModalProduct.name} (${grindOption})` : activeModalProduct.name;
    const itemKey = `${activeModalProduct.id}_${finalWeight}_${grindOption || 'default'}`;
    
    setCart(prev => {
      const exists = prev.find(i => i.key === itemKey);
      if (exists) return prev.map(i => i.key === itemKey ? { ...i, qty: i.qty + modalQty } : i);
      return [...prev, { key: itemKey, name: finalName, category: activeModalProduct.category, weight: finalWeight, price: finalPrice, originalPrice: finalOriginalPrice, qty: modalQty }];
    });
    
    setActiveModalProduct(null);
    setToast({ visible: true, message: `تمت إضافة "${finalName}" بنجاح` });
    setTimeout(() => setToast({ visible: false, message: '' }), 2500);
  };

  const updateCartQty = (key, delta) => {
    triggerVibration();
    setCart(prev => prev.map(item => item.key === key ? (item.qty + delta > 0 ? { ...item, qty: item.qty + delta } : null) : item).filter(Boolean));
  };

  const removeCartItem = (key) => {
    triggerVibration();
    setCart(prev => prev.filter(item => item.key !== key));
  };

  const clearEntireCart = () => {
    setCart([]);
    setIsEditing(false);
    setShowClearConfirm(false);
    setConfettiFired(false);
  };

  const totalAmount = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.qty), 0).toFixed(2), [cart]);
  const totalItemsCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const currentTotalNumber = parseFloat(totalAmount) || 0;
  const deliveryProgressPercent = Math.min((currentTotalNumber / FREE_DELIVERY_THRESHOLD) * 100, 100);
  const remainingForFreeDelivery = (FREE_DELIVERY_THRESHOLD - currentTotalNumber).toFixed(2);

  const addressWarning = useMemo(() => {
    if (!customer.deliveryZone || !customer.address) return null;
    const addr = customer.address.trim();
    const isDamanhour = /^دمنهور/i.test(addr) || addr.includes('دمنهور');
    const isOutsideCities = /^(الاسكندرية|الإسكندرية|كفر الدوار|أبو حمص|ابو حمص|القاهرة|طنطا|دسوق|دسووق|رشيد|ايتاى|إيتاي|شبراخيت|الرحمانية|المحمودية|ادكو|إدكو|كوم حمادة|وادي النطرون|حوش عيسى)/i.test(addr);

    if (customer.deliveryZone === 'damanhour' && isOutsideCities && !isDamanhour) {
      return "⚠️ العنوان يبدو خارج دمنهور، برجاء مراجعة مكان التوصيل.";
    }
    if (customer.deliveryZone === 'outside' && /^دمنهور/i.test(addr)) {
      return "⚠️ العنوان يبدو داخل دمنهور، برجاء مراجعة مكان التوصيل.";
    }
    return null;
  }, [customer.address, customer.deliveryZone]);

  useEffect(() => {
    if (customer.deliveryZone === 'damanhour' && currentTotalNumber >= FREE_DELIVERY_THRESHOLD && !confettiFired && window.confetti) {
      window.confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setConfettiFired(true);
    } else if (currentTotalNumber < FREE_DELIVERY_THRESHOLD || customer.deliveryZone === 'outside') {
      setConfettiFired(false);
    }
  }, [currentTotalNumber, customer.deliveryZone, confettiFired]);

  const validateForm = () => {
    const errors = {};
    if (!customer.name.trim()) errors.name = 'يرجى إدخال الاسم الكامل';
    
    const cleanPhone = customer.phone.replace(/\s+/g, '');
    if (!cleanPhone || !/^01[0125][0-9]{8}$/.test(cleanPhone)) {
      errors.phone = 'رقم هاتف غير صحيح';
    }
    
    if (!customer.deliveryZone) errors.deliveryZone = 'من فضلك اختر مكان التوصيل أولاً.';
    if (!customer.address.trim()) errors.address = 'يرجى إدخال العنوان';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProceedToReview = (e) => {
    e.preventDefault();
    if (validateForm()) {
      try { localStorage.setItem('sedra_customer', JSON.stringify(customer)); } catch (e) { console.error(e); }
      setCurrentStep('review');
    }
  };

  const handleRestoreOrderRequest = () => {
    if (cart.length > 0) setShowRestoreConfirm(true);
    else executeRestore();
  };

  const executeRestore = () => {
    if (lastOrder?.items) {
      setCart(lastOrder.items);
      setIsEditing(true);
      setShowRestoreConfirm(false);
      setToast({ visible: true, message: 'تم استرجاع الطلب لتعديله' });
      setTimeout(() => setToast({ visible: false, message: '' }), 2500);
    }
  };

  const handleSendWhatsAppOrder = () => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    
    let orderId = `SD-${dd}/${mm}-${hh}:${mins}`;

    if (lastOrder && (lastOrder.id === orderId || lastOrder.id.startsWith(`${orderId}-`))) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      const randomChar = chars.charAt(Math.floor(Math.random() * chars.length));
      orderId = `${orderId}-${randomChar}`;
    }

    let message = isEditing ? `🔄 تعديل على الطلب السابق من متجر عطارة سدرة\n` : `🛒 طلب جديد من متجر عطارة سدرة\n`;
    message += `🏷️ رقم الطلب: ${orderId}\n`;
    
    if (isEditing && lastOrder) {
      message += `(هذا تعديل للطلب القديم رقم: ${lastOrder.id})\n\n`;
    } else {
      message += `\n`;
    }

    message += `👤 الاسم: ${customer.name.trim()}\n📱 الهاتف: ${customer.phone.trim()}\n📍 مكان التوصيل: ${customer.deliveryZone === 'damanhour' ? 'داخل دمنهور' : 'خارج دمنهور'}\n📍 العنوان: ${customer.address.trim()}\n`;
    if (customer.notes.trim()) message += `📝 ملاحظات: ${customer.notes.trim()}\n`;
    message += `\n📦 المنتجات المطلوبة:\n\n`;
    
    let totalWeightGrams = 0;
    cart.forEach((item, index) => {
      totalWeightGrams += (getWeightNumberInGrams(item.weight) * item.qty);
      const itemTotal = (item.price * item.qty).toFixed(2);
      const itemOriginalTotal = item.originalPrice ? (item.originalPrice * item.qty).toFixed(2) : null;
      message += `*${index + 1}. ${item.name}*\n   🔷 الوزن: ${getCalculatedTotalWeight(item.weight, item.qty)}\n`;
      if (itemOriginalTotal && parseFloat(itemOriginalTotal) > parseFloat(itemTotal)) {
        message += `   🔷 السعر: ~${itemOriginalTotal}~ جنيه *${itemTotal} جنيه*\n\n`;
      } else {
        message += `   🔷 السعر: *${itemTotal} جنيه*\n\n`;
      }
    });

    message += `────────────\n\n⚖️ إجمالي الوزن: ${totalWeightGrams < 1000 ? `${totalWeightGrams} جرام` : `${totalWeightGrams / 1000} كجم (${totalWeightGrams} جرام)`}\n`;
    
    if (customer.deliveryZone === 'damanhour') {
      if (currentTotalNumber >= FREE_DELIVERY_THRESHOLD) {
        message += `🎁 مستحق للتوصيل المجاني داخل دمنهور\n`;
      }
      message += `💰 إجمالي الفاتورة: ${totalAmount} جنيه\n\n`;
      message += `✨ الدفع عند الاستلام بعد المعاينة\n\n⏳ انتظرونا خلال 24 إلى 48 ساعة لوصول الأوردر، والتوصيل يوميًا من الساعة 5 مساءً حتى 9 مساءً.`;
    } else if (customer.deliveryZone === 'outside') {
      message += `💰 إجمالي الفاتورة: ${totalAmount} جنيه\n\n`;
      message += `📦 *طريقة الشحن عبر البريد المصري:*\n`;
      message += `📌 *سريع:* تسليم باليد على العنوان.\n`;
      message += `📌 *عادي:* استلام من أقرب مكتب بريد.\n`;
      message += `💰 يتم إبلاغكم بمصاريف الشحن قبل الإرسال.\n\n`;
      message += `*يرجى إبلاغنا بطريقة الشحن المناسبة.*\n\n`;
      message += `💳 *لتأكيد الطلب:*\n`;
      message += `تحويل قيمة الفاتورة عبر InstaPay على:\n`;
      message += `*01009750003*`;
    }

    const nowTs = Date.now();
    const orderData = { 
      id: orderId, 
      items: cart, 
      createdAt: isEditing ? lastOrder.createdAt : nowTs, 
      expiresAt: isEditing ? lastOrder.expiresAt : nowTs + EDIT_WINDOW_MS 
    };
    
    localStorage.setItem('sedra_last_order', JSON.stringify(orderData));
    setLastOrder(orderData);
    
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
    setCart([]);
    setIsEditing(false);
    setCustomer(prev => {
      const nextData = { ...prev, notes: '' };
      localStorage.setItem('sedra_customer', JSON.stringify(nextData));
      return nextData;
    });
    setIsCartOpen(false);
    setCurrentStep('cart');
  };

  return (
    <div className="min-h-screen pb-32 text-slate-800 selection:bg-brand-accent selection:text-white bg-[#fbf9f4] relative">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes flyToCart {
          0% { top: var(--startY); left: var(--startX); transform: scale(1) rotate(0deg); opacity: 1; }
          40% { top: calc(var(--startY) - 80px); left: calc((var(--startX) + var(--endX)) / 2); transform: scale(1.3) rotate(15deg); opacity: 0.9; }
          100% { top: var(--endY); left: var(--endX); transform: scale(0.1) rotate(45deg); opacity: 0; }
        }
      `}} />

      {flyingItems.map(item => (
        <img key={item.id} src={item.img} alt="flying" className="fixed z-[100000] w-12 h-12 rounded-full border-2 border-[#d4af37] shadow-xl object-cover pointer-events-none" style={{ '--startX': `${item.startX}px`, '--startY': `${item.startY}px`, '--endX': `${item.endX - 24}px`, '--endY': `${item.endY - 24}px`, animation: 'flyToCart 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards' }} />
      ))}

      {showWelcomeBack && (
        <div className="fixed inset-0 bg-black/70 z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-[#e8f5e9] rounded-full flex items-center justify-center mx-auto mb-3"><ShoppingBag className="w-8 h-8 text-[#2d533e]" /></div>
            <h3 className="font-black text-lg text-[#1e382b] mb-2">أهلاً بك مرة تانية! 🌿</h3>
            <p className="text-sm text-slate-500 mb-5 font-semibold">منتجاتك في السلة في أمان ومستنية تأكيدك..</p>
            <button onClick={() => setShowWelcomeBack(false)} className="w-full bg-[#2d533e] text-white py-3 rounded-xl font-bold text-sm shadow-md">متابعة التسوق</button>
          </div>
        </div>
      )}

      <div className={`fixed left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 ease-in-out pointer-events-none flex items-center gap-2.5 bg-white text-gray-800 border-r-4 border-emerald-500 shadow-2xl rounded-xl px-4 py-3 w-max max-w-[90vw] ${toast.visible ? 'bottom-24 opacity-100' : 'bottom-16 opacity-0'}`}>
        <div className="bg-emerald-100 rounded-full p-1"><Check className="w-4 h-4 text-emerald-600 stroke-[3]" /></div>
        <span className="font-bold text-sm md:text-base truncate text-slate-700">{toast.message}</span>
      </div>

      <header className="pt-2 pb-0 px-4 max-w-xl mx-auto flex flex-col items-center justify-center">
        <div className="w-full max-w-[340px] sm:max-w-[380px] bg-white rounded-3xl p-2 shadow-sm border border-[#e8e2d5] flex flex-col items-center">
          <div className="w-full aspect-[16/10] rounded-2xl overflow-hidden flex items-center justify-center bg-white"><img src="/logo.png" alt="عطارة سدرة" className="w-full h-full object-cover" /></div>
          <div style={{ background: 'linear-gradient(135deg, #173023 0%, #224432 50%, #173023 100%)', border: '2px solid #d4af37', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }} className="w-full mt-1.5 mb-0 py-1.5 px-3 rounded-2xl flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-[#d4af37] shrink-0 animate-pulse" />
            <span className="text-[15px] sm:text-base font-black text-[#fff4d6] tracking-wide text-center leading-tight">ما تدفعش ولا جنيه غير بعد المعاينة</span>
            <ShieldCheck className="w-5 h-5 text-[#d4af37] shrink-0" />
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 mt-0">
        <div className="sticky top-0 z-30 bg-[#fbf9f4]/98 backdrop-blur-md pt-1 pb-2.5 -mx-4 px-4 border-b border-[#e8e2d5] shadow-xs mb-3">
          
          {isEditing && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 mb-2.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" style={{ animationDuration: '3s' }} />
                <div>
                  <h4 className="text-amber-800 text-xs font-black">أنت الآن تقوم بتعديل طلبك السابق</h4>
                  <p className="text-amber-700 text-[10px] font-bold">({lastOrder?.id})</p>
                </div>
              </div>
              <button onClick={() => { setIsEditing(false); setCart([]); }} className="text-red-600 hover:text-red-800 text-[10px] font-black underline shrink-0">إلغاء التعديل</button>
            </div>
          )}

          <div className="flex items-center gap-2 mb-2.5">
            <div className="flex-1 bg-white rounded-2xl shadow-xs p-2 flex items-center gap-2 border border-[#e8e2d5]">
              <Search className="w-4 h-4 text-[#4d7c60] mr-1.5 shrink-0" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن منتج بالاسم..." className="w-full bg-transparent focus:outline-none text-sm font-semibold text-[#1e382b]" />
              {search && <button onClick={() => setSearch('')} className="p-1 text-slate-400"><X className="w-4 h-4" /></button>}
            </div>

            {lastOrder && !isEditing && (
              <button onClick={handleRestoreOrderRequest} className="bg-[#2d533e] hover:bg-[#1e382b] text-white text-xs font-bold px-3.5 py-3 rounded-2xl transition shadow-sm flex items-center gap-1.5 shrink-0" title="استرجاع وتعديل طلبك السابق">
                <RotateCcw className="w-4 h-4 text-[#c89d56]" />
                <span>تعديل آخر طلب</span>
              </button>
            )}
          </div>

          {!loading && !error && displayCategories.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 pt-1 pb-1">
              {displayCategories.map(cat => {
                const isSelected = selectedCategory === cat;
                const isOfferBtn = cat === 'فرص خاصة';
                const visual = getCategoryVisual(cat);
                
                let btnStyle = {};
                let textClass = '';

                if (isOfferBtn) {
                  if (isSelected) {
                    btnStyle = { background: 'linear-gradient(135deg, #d63031 0%, #ff7675 100%)', border: '1.5px solid #ff7675', color: '#ffffff', boxShadow: '0 3px 8px rgba(214, 48, 49, 0.3)' };
                    textClass = 'text-white';
                  } else {
                    btnStyle = { background: 'linear-gradient(135deg, #fff0f0 0%, #ffe3e3 100%)', border: '1.5px solid #ff7675', color: '#d63031' };
                    textClass = 'text-[#d63031]';
                  }
                } else {
                  if (isSelected) {
                    btnStyle = { background: 'linear-gradient(135deg, #1b3d2b 0%, #0e2417 100%)', border: '1.5px solid #d4af37', color: '#fff9ea', boxShadow: '0 3px 8px rgba(212, 175, 55, 0.25)' };
                    textClass = 'text-[#fff4d6]';
                  } else {
                    btnStyle = { background: '#ffffff', border: '1.5px solid #e2d9c8', color: '#1b3828' };
                    textClass = 'text-[#1e382b]';
                  }
                }

                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={btnStyle}
                    className="px-2.5 py-1.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 active:scale-95 shadow-2xs group"
                  >
                    <span className="text-sm leading-none">{visual.icon}</span>
                    <span className={`text-xs font-bold leading-tight ${textClass}`}>{visual.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center py-16 text-[#2d533e] font-bold">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-[#c89d56]" />
            جاري تحميل قائمة الأسعار...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-center my-6 shadow-xs">
            <p className="text-sm font-bold mb-2.5">{error}</p>
            <button onClick={fetchData} className="bg-[#2d533e] text-white text-sm px-4 py-2 rounded-lg font-bold inline-flex items-center gap-1 shadow"><RefreshCw className="w-4 h-4" /> إعادة المحاولة</button>
          </div>
        )}

        {!loading && !error && (
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-xs font-bold text-slate-500">{selectedCategory} ({filteredProducts.length} منتج)</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {filteredProducts.map(product => (
                <div key={product.id} className={`bg-white rounded-2xl p-3 border shadow-2xs flex flex-col justify-between transition ${product.isAvailable ? 'border-[#e8e2d5] hover:shadow-sm' : 'border-red-100 bg-[#fffcfc]'}`}>
                  <div>
                    <div className="flex items-start gap-2 mb-2">
                      <div onClick={(e) => { e.stopPropagation(); if (product.image) setZoomedImage(product.image); }} className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-100 border overflow-hidden shrink-0 relative group cursor-pointer ${product.isAvailable ? 'border-[#e8e2d5]' : 'border-red-100 opacity-70'}`} title="انقر لتكبير الصورة">
                        {product.image ? (
                          <img src={product.image} alt={product.name} referrerPolicy="no-referrer" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-200" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 bg-[#fbf9f4]"><ImageIcon className="w-6 h-6 text-[#4d7c60]/50" /></div>
                        )}
                        {product.image && <span className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[9px] font-bold">تكبير</span>}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className={`text-[9px] font-bold px-1 py-0.2 rounded border truncate max-w-[70%] ${product.isAvailable ? 'text-[#c89d56] bg-[#fbf9f4] border-[#e8e2d5]' : 'text-slate-400 bg-slate-50 border-slate-200'}`} title={product.category}>{product.category}</span>
                          <button onClick={(e) => handleShareProduct(product, e)} className="p-1 text-slate-400 hover:text-[#2d533e] transition rounded-md" title="مشاركة المنتج"><Share2 className="w-3.5 h-3.5" /></button>
                        </div>
                        <h3 onClick={() => product.isAvailable && openProductModal(product)} className={`font-bold text-sm sm:text-base line-clamp-2 leading-snug cursor-pointer hover:text-[#2d533e] ${product.isAvailable ? 'text-[#1e382b]' : 'text-slate-500'}`}>{product.name}</h3>
                      </div>
                    </div>
                  </div>

                  <div onClick={() => product.isAvailable && openProductModal(product)} className="cursor-pointer">
                    <div className="text-[11px] text-slate-500 font-semibold mb-2.5">
                      {product.variants.map((v, i) => {
                        const hasOffer = isOfferValid(v.price, v.originalPrice);
                        return (
                          <div key={i} className="flex justify-between items-center py-1 border-t border-slate-50">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[11px] sm:text-xs font-bold ${!v.available ? 'line-through text-slate-300' : 'text-slate-600'}`}>{v.weight}</span>
                              {hasOffer && v.available && <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded shadow-sm font-bold">فرصة خاصة</span>}
                            </div>
                            <div className={`font-bold flex flex-col items-end justify-center ${v.available ? 'text-[#2d533e]' : 'text-slate-400'}`}>
                              {v.available ? (
                                <>
                                  {hasOffer && <span className="text-slate-500 line-through decoration-slate-400/80 text-[10px] font-semibold leading-none mb-0.5">{v.originalPrice} جنيه</span>}
                                  <span className="text-xs sm:text-sm leading-none">{v.price} جنيه</span>
                                </>
                              ) : (
                                <span className="text-xs sm:text-sm font-bold leading-none">0</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {product.isAvailable ? (
                      <button className="w-full bg-[#2d533e] text-white text-sm py-2.5 rounded-xl font-black flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#1e382b] transition"><Plus className="w-4 h-4" /> اختيار</button>
                    ) : (
                      <button disabled className="w-full bg-[#fff0f0] text-[#d63031] border border-[#ffcccc] text-sm py-2.5 rounded-xl font-black flex items-center justify-center gap-1.5 opacity-90 cursor-not-allowed shadow-sm"><Ban className="w-4 h-4" /> غير متوفر</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
          <div className="text-center py-14 text-slate-400 font-bold text-sm">لا توجد منتجات مطابقة لعملية البحث</div>
        )}
      </main>

      {activeModalProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md max-h-[95vh] rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-100 shrink-0 bg-white z-10">
              <div className="flex items-start gap-3">
                {activeModalProduct.image && (
                  <div onClick={(e) => { e.stopPropagation(); setZoomedImage(activeModalProduct.image); }} className="w-12 h-12 rounded-xl bg-slate-100 border border-[#e8e2d5] overflow-hidden shrink-0 cursor-pointer relative group" title="انقر لتكبير الصورة">
                    <img src={activeModalProduct.image} alt={activeModalProduct.name} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                    <span className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[9px] font-bold">تكبير</span>
                  </div>
                )}
                <div className="flex-1 pr-1">
                  <span className="text-[10px] font-bold text-[#c89d56] block mb-0.5">{activeModalProduct.category}</span>
                  <h2 className="text-base sm:text-lg font-black text-[#1e382b] leading-snug">{activeModalProduct.name}</h2>
                </div>
                <button onClick={() => setActiveModalProduct(null)} className="p-1.5 bg-slate-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
              <div className="space-y-2.5">
                <label className="text-xs font-black text-slate-800 block mb-1.5 border-b border-slate-50 pb-1">الأوزان المتاحة</label>
                <div className="grid grid-cols-2 gap-2">
                  {activeModalProduct.variants.map((variant, idx) => {
                    const isSelected = !isCustomWeight && selectedVariant?.weight === variant.weight;
                    const displayWeight = isSelected ? getCalculatedTotalWeight(variant.weight, modalQty) : variant.weight;
                    const displayPrice = isSelected ? (variant.price * modalQty).toFixed(2) : variant.price;
                    const hasOffer = isOfferValid(variant.price, variant.originalPrice);
                    const displayOriginalPrice = isSelected && hasOffer ? (variant.originalPrice * modalQty).toFixed(2) : variant.originalPrice;

                    return (
                      <button key={idx} disabled={!variant.available} onClick={() => { triggerVibration(); setSelectedVariant(variant); setIsCustomWeight(false); }} className={`p-2.5 rounded-xl border-2 text-right transition relative ${!variant.available ? 'opacity-40 bg-slate-50 border-slate-200 cursor-not-allowed' : isSelected ? 'border-[#2d533e] bg-[#2d533e]/5 text-[#1e382b] shadow-sm' : 'border-[#e8e2d5] text-slate-700 hover:border-[#c89d56]'}`}>
                        {hasOffer && variant.available && <span className="absolute -top-2.5 -left-2 bg-[#d63031] text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm font-black border border-white z-10">فرصة خاصة</span>}
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm font-black">{displayWeight}</span>
                        </div>
                        <div className="text-xs sm:text-sm font-black text-[#2d533e] mt-0.5 flex flex-col">
                          {variant.available ? (
                            <div className="flex items-center gap-1"><span>{displayPrice} جنيه</span>{hasOffer && <span className="text-slate-500 line-through decoration-slate-400 text-[10px] font-bold">{displayOriginalPrice} جنيه</span>}</div>
                          ) : <span className="text-slate-400">0</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div onClick={() => { triggerVibration(); setIsCustomWeight(true); }} className={`p-3 rounded-xl border-2 transition cursor-pointer ${isCustomWeight ? 'border-red-600 bg-red-50 shadow-sm' : 'border-[#e8e2d5] bg-white hover:border-red-300'}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isCustomWeight ? 'border-red-600 bg-red-600' : 'border-slate-300 bg-white'}`}>{isCustomWeight && <div className="w-1.5 h-1.5 rounded-full bg-white" />}</div>
                    <span className={`text-sm font-black ${isCustomWeight ? 'text-red-700' : 'text-slate-600'}`}>وزن مخصص بالجرام</span>
                  </div>
                  {isCustomWeight && (
                    <div className="mt-2.5 pl-6" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <input type="number" inputMode="numeric" pattern="[0-9]*" min="1" value={customWeightValue} onChange={(e) => setCustomWeightValue(e.target.value.replace(/[^0-9]/g, ''))} placeholder="مثال: 300" className="flex-1 p-2 text-center text-sm font-black border-2 border-red-300 rounded-lg outline-none focus:border-red-600 bg-white shadow-sm text-red-700 placeholder:text-red-300/60" />
                        <span className="text-sm font-black text-red-700 shrink-0">جرام</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {activeModalProduct.parsedGrindOptions && activeModalProduct.parsedGrindOptions.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-black text-slate-800 block mb-1.5 border-b border-slate-50 pb-1">حالة المنتج</span>
                  {activeModalProduct.parsedGrindOptions.length === 1 ? (
                    <div className="w-full">
                      <div className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#f4f4f4] border-2 border-[#e8e8e8] text-slate-500 text-xs font-black rounded-xl cursor-default select-none w-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        <span>{activeModalProduct.parsedGrindOptions[0]} <span className="text-[10px] font-bold text-slate-400">(فقط)</span></span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 w-full" role="radiogroup" aria-label="حالة المنتج">
                      {activeModalProduct.parsedGrindOptions.map((opt, i) => {
                        const isSelected = grindOption === opt;
                        return (
                          <button
                            key={i}
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => { triggerVibration(); setGrindOption(opt); }}
                            className={`relative flex-1 py-2.5 px-2 rounded-xl border-2 transition-all duration-200 outline-none focus-visible:ring-4 focus-visible:ring-[#2d533e]/20 ${
                              isSelected 
                                ? 'bg-[#2d533e] border-[#2d533e] text-white shadow-md z-10' 
                                : 'bg-white border-[#e8e2d5] text-slate-500 hover:border-[#c89d56] hover:bg-[#fffdf8] hover:text-[#1e382b]'
                            }`}
                          >
                            <div className="flex items-center justify-center w-full relative">
                              <span className="font-black text-xs sm:text-sm">{opt}</span>
                              {isSelected && (
                                <div className="absolute right-0 flex items-center justify-center animate-in zoom-in duration-200">
                                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[3]" />
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2 pb-1">
                <span className="text-xs font-black text-slate-800 block mb-1.5 border-b border-slate-50 pb-1">الكمية المطلوبة</span>
                <div className="flex items-center gap-3 justify-center bg-slate-50 py-1.5 rounded-xl border border-slate-100">
                  <button onClick={() => { triggerVibration(); setModalQty(Math.max(1, modalQty - 1)); }} className="w-8 h-8 rounded-lg bg-white border-2 border-[#e8e2d5] flex items-center justify-center font-bold text-[#1e382b] shadow-sm hover:bg-slate-100"><Minus className="w-4 h-4" /></button>
                  <span className="font-black text-base text-[#1e382b] w-6 text-center">{modalQty}</span>
                  <button onClick={() => { triggerVibration(); setModalQty(modalQty + 1); }} className="w-8 h-8 rounded-lg bg-white border-2 border-[#e8e2d5] flex items-center justify-center font-bold text-[#1e382b] shadow-sm hover:bg-slate-100"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 pb-4 pt-3 border-t border-slate-100 bg-white shrink-0 z-10">
              <button disabled={(!selectedVariant || !selectedVariant.available) || (isCustomWeight && (!customWeightValue || parseInt(customWeightValue) <= 0))} onClick={(e) => addToCart(e)} className="w-full bg-[#2d533e] disabled:opacity-50 text-white py-3 rounded-xl font-black text-sm sm:text-base shadow-sm hover:bg-[#1e382b] transition transform active:scale-[0.98]">
                {(() => {
                  if (isCustomWeight && (!customWeightValue || parseInt(customWeightValue) <= 0)) return 'أدخل الوزن المطلوب أولاً';
                  if (!selectedVariant?.available) return 'هذا الصنف غير متوفر حالياً';
                  return `إضافة للسلة (${getCalculatedTotalWeight(isCustomWeight ? `${customWeightValue} جرام` : selectedVariant.weight, modalQty)}) — ${(getCalculatedPrice() * modalQty).toFixed(2)} جنيه`;
                })()}
              </button>
            </div>
          </div>
        </div>
      )}

      {zoomedImage && (
        <div style={{ zIndex: 99999 }} className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-sm sm:max-w-md w-full bg-white rounded-3xl p-3 shadow-2xl flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setZoomedImage(null)} className="absolute top-4 left-4 z-20 p-2 bg-black/60 text-white rounded-full"><X className="w-5 h-5" /></button>
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center"><img src={zoomedImage} alt="صورة المنتج" referrerPolicy="no-referrer" className="w-full h-full object-contain" /></div>
            <p className="text-sm font-bold text-slate-300 mt-3">انقر في أي مكان للإغلاق</p>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-[#e8e2d5] z-30 shadow-md">
        <div className="max-w-xl mx-auto flex items-center gap-2">
          <button ref={cartIconRef} onClick={() => { triggerVibration(); setCurrentStep('cart'); setIsCartOpen(true); }} className="w-full bg-[#1e382b] text-white p-3.5 rounded-2xl font-bold flex items-center justify-between shadow-lg active:scale-[0.99] transition">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <ShoppingBag className="w-6 h-6 text-[#c89d56]" />
                {totalItemsCount > 0 && <span className="absolute -top-2.5 -right-2.5 bg-[#c89d56] text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black">{totalItemsCount}</span>}
              </div>
              <span className="text-sm font-black">سلة الطلبات</span>
            </div>
            <span className="text-sm text-[#c89d56] font-black">{totalAmount} جنيه</span>
          </button>
        </div>
      </div>

      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md max-h-[95vh] rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Unified Modal Header */}
            <div className="px-4 py-3.5 border-b border-slate-100 shrink-0 bg-white z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-black text-[#1e382b]">
                  {currentStep === 'cart' && 'سلة المشتريات'}
                  {currentStep === 'checkout' && 'بيانات توصيل الطلب'}
                  {currentStep === 'review' && 'مراجعة الطلب قبل الإرسال'}
                </h2>
                {currentStep === 'cart' && cart.length > 0 && (
                  <button onClick={() => setShowClearConfirm(true)} className="text-[11px] font-black text-red-600 px-2.5 py-1.5 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors">مسح السلة</button>
                )}
              </div>
            </div>

            {/* Unified Modal Body (Flex-1 for native scrolling) */}
            <div className="flex-1 overflow-y-auto p-4 bg-white">
              
              {currentStep === 'cart' && (
                <div className="space-y-4">
                  {cart.length > 0 && customer.deliveryZone !== 'outside' && (
                    <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-center mb-2.5">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-[#2d533e]"/> توصيل مجاني داخل دمنهور</span>
                        <span className="text-[11px] font-black text-[#2d533e]">{currentTotalNumber >= FREE_DELIVERY_THRESHOLD ? 'مؤهل للتوصيل المجاني 🎉' : `باقي ${remainingForFreeDelivery} جنيه`}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${currentTotalNumber >= FREE_DELIVERY_THRESHOLD ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${deliveryProgressPercent}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="divide-y divide-slate-100 pb-2">
                    {cart.length === 0 ? <div className="text-center py-12 text-slate-400 font-bold text-sm">السلة فارغة حالياً</div> : (
                      cart.map(item => (
                        <div key={item.key} className="py-2.5 flex justify-between items-center gap-2">
                          <div className="flex-1">
                            <h4 className="font-black text-xs sm:text-sm text-[#1e382b] leading-snug">{item.name}</h4>
                            <div className="text-[10px] sm:text-[11px] text-slate-500 font-bold mt-1">الوزن: {getCalculatedTotalWeight(item.weight, item.qty)}</div>
                            <div className="text-[11px] sm:text-xs text-[#2d533e] font-black mt-1 flex items-center gap-1.5">
                              <span>الإجمالي: {(item.price * item.qty).toFixed(2)} جنيه</span>
                              {item.originalPrice && parseFloat(item.originalPrice) > parseFloat(item.price) && <span className="text-slate-400 line-through font-bold">{(item.originalPrice * item.qty).toFixed(2)} جنيه</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => updateCartQty(item.key, -1)} className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-700 hover:bg-slate-200"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="text-xs sm:text-sm font-black w-4 sm:w-5 text-center">{item.qty}</span>
                            <button onClick={() => updateCartQty(item.key, 1)} className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-700 hover:bg-slate-200"><Plus className="w-3.5 h-3.5" /></button>
                            <button onClick={() => removeCartItem(item.key)} className="w-7 h-7 sm:w-8 sm:h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-100 ml-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {currentStep === 'checkout' && (
                <form id="checkout-form" onSubmit={handleProceedToReview} className="space-y-3">
                  <div>
                    <label className="text-[11px] sm:text-xs font-bold text-slate-700 block mb-1">الاسم الكامل <span className="text-red-500">*</span></label>
                    <input type="text" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="أدخل اسمك بالكامل" className={`w-full py-2.5 px-3 text-sm font-bold rounded-xl border-2 ${formErrors.name ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:border-[#2d533e]'} outline-none`} />
                  </div>
                  
                  <div>
                    <label className="text-[11px] sm:text-xs font-bold text-slate-700 block mb-1">رقم الهاتف <span className="text-red-500">*</span></label>
                    <input type="tel" dir="ltr" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="01012345678" className={`w-full py-2.5 px-3 text-sm font-bold rounded-xl border-2 text-right ${formErrors.phone ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:border-[#2d533e]'} outline-none`} />
                  </div>

                  <div className="pt-1">
                    <div className="flex gap-2 w-full" role="radiogroup" aria-label="مكان التوصيل">
                      <button type="button" role="radio" aria-checked={customer.deliveryZone === 'damanhour'} onClick={() => { triggerVibration(); setCustomer({ ...customer, deliveryZone: 'damanhour' }); }} className={`flex-1 py-2.5 px-2 rounded-xl border-2 transition-all font-black text-sm flex items-center justify-center gap-1.5 outline-none ${customer.deliveryZone === 'damanhour' ? 'bg-[#2d533e] border-[#2d533e] text-white shadow-sm' : 'bg-white border-[#e8e2d5] text-slate-500'}`}>
                        {customer.deliveryZone === 'damanhour' && <Check className="w-4 h-4" />} داخل دمنهور
                      </button>
                      <button type="button" role="radio" aria-checked={customer.deliveryZone === 'outside'} onClick={() => { triggerVibration(); setCustomer({ ...customer, deliveryZone: 'outside' }); }} className={`flex-1 py-2.5 px-2 rounded-xl border-2 transition-all font-black text-sm flex items-center justify-center gap-1.5 outline-none ${customer.deliveryZone === 'outside' ? 'bg-[#2d533e] border-[#2d533e] text-white shadow-sm' : 'bg-white border-[#e8e2d5] text-slate-500'}`}>
                        {customer.deliveryZone === 'outside' && <Check className="w-4 h-4" />} خارج دمنهور
                      </button>
                    </div>
                    {formErrors.deliveryZone && <p className="text-red-500 text-[10px] font-bold mt-1.5">{formErrors.deliveryZone}</p>}
                  </div>

                  <div>
                    <label className="text-[11px] sm:text-xs font-bold text-slate-700 block mb-1">العنوان بالتفصيل <span className="text-red-500">*</span></label>
                    <textarea rows={2} value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} placeholder="المحافظة - المدينة - المنطقة - الشارع - رقم المنزل" className={`w-full py-2.5 px-3 text-sm font-bold rounded-xl border-2 ${formErrors.address ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:border-[#2d533e]'} outline-none resize-none`} />
                    {addressWarning && (
                      <div className="mt-1.5 bg-amber-50 border border-amber-200 p-1.5 rounded-lg flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span className="text-[10px] font-bold text-amber-800 leading-snug">{addressWarning}</span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-[11px] sm:text-xs font-bold text-slate-700 block mb-1">ملاحظات على الطلب (اختياري)</label>
                    <textarea rows={2} value={customer.notes} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} placeholder="مثال: يفضل التواصل معي قبل التوصيل، أو اكتب أي ملاحظة خاصة بالطلب." className="w-full py-2.5 px-3 text-sm font-bold rounded-xl border-2 border-slate-200 focus:border-[#2d533e] outline-none resize-none placeholder:text-slate-400 placeholder:font-semibold placeholder:text-[10px] sm:placeholder:text-[11px]" />
                  </div>
                </form>
              )}

              {currentStep === 'review' && (
                <div className="space-y-3 pb-2">
                  <div className="bg-[#fbf9f4] p-3 rounded-2xl border-2 border-[#e8e2d5]">
                    <h4 className="text-xs sm:text-sm font-black text-[#1e382b] mb-2 pb-2 border-b border-[#e8e2d5]">بيانات العميل والتوصيل:</h4>
                    <div className="text-[11px] sm:text-xs space-y-1.5 text-slate-700 font-semibold">
                      <div><strong className="font-black text-slate-800">الاسم:</strong> {customer.name}</div>
                      <div><strong className="font-black text-slate-800">الهاتف:</strong> {customer.phone}</div>
                      <div><strong className="font-black text-slate-800">مكان التوصيل:</strong> {customer.deliveryZone === 'damanhour' ? 'داخل دمنهور' : 'خارج دمنهور'}</div>
                      <div><strong className="font-black text-slate-800">العنوان:</strong> {customer.address}</div>
                      {customer.notes && <div><strong className="font-black text-slate-800">الملاحظات:</strong> {customer.notes}</div>}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border-2 border-slate-100">
                    <h4 className="text-xs sm:text-sm font-black text-[#1e382b] mb-2 pb-2 border-b border-slate-100">المنتجات المطلوبة:</h4>
                    <div className="space-y-2 divide-y divide-slate-50">
                      {cart.map((item, idx) => (
                        <div key={idx} className="pt-2 first:pt-0 flex justify-between items-center text-[11px] sm:text-xs">
                          <div><span className="font-black text-[#1e382b] block">{item.name}</span><span className="text-[10px] text-slate-500 font-bold mt-0.5 block">{getCalculatedTotalWeight(item.weight, item.qty)}</span></div>
                          <span className="font-black text-[#2d533e]">{(item.price * item.qty).toFixed(2)} جنيه</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Unified Modal Footer (Sticky Bottom) */}
            <div className="px-4 pb-4 pt-3 border-t border-slate-100 bg-white shrink-0 z-10">
              <div className="flex justify-between items-center font-black text-sm pb-2.5">
                <span className="text-slate-700">الإجمالي النهائي:</span>
                <span className="text-[#2d533e] text-base sm:text-lg">{totalAmount} جنيه</span>
              </div>

              {currentStep === 'cart' && (
                <div className="flex flex-col gap-2">
                  <button disabled={cart.length === 0} onClick={() => setCurrentStep('checkout')} className="w-full bg-[#2d533e] disabled:opacity-50 text-white py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#1e382b] transition-transform active:scale-[0.98]"><span>متابعة إتمام الطلب</span><ChevronRight className="w-3.5 h-3.5 rotate-180" /></button>
                  <button onClick={() => setIsCartOpen(false)} className="w-full bg-white text-red-600 border-2 border-red-500 py-3 rounded-xl font-black text-xs sm:text-sm hover:bg-red-50 transition-colors">رجوع لمتابعة التسوق</button>
                </div>
              )}

              {currentStep === 'checkout' && (
                <div className="flex flex-col gap-2">
                  <button form="checkout-form" type="submit" className="w-full bg-[#2d533e] text-white py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#1e382b] transition-transform active:scale-[0.98]"><span>مراجعة الطلب قبل الإرسال</span><ChevronRight className="w-3.5 h-3.5 rotate-180" /></button>
                  <button onClick={() => setIsCartOpen(false)} className="w-full bg-white text-red-600 border-2 border-red-500 py-3 rounded-xl font-black text-xs sm:text-sm hover:bg-red-50 transition-colors">رجوع لمتابعة التسوق</button>
                </div>
              )}

              {currentStep === 'review' && (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentStep('checkout')} className="flex-1 bg-slate-100 text-[#1e382b] border-2 border-slate-200 hover:bg-slate-200 py-3 rounded-xl font-black text-xs sm:text-sm transition-colors">تعديل البيانات</button>
                    <button onClick={handleSendWhatsAppOrder} className="flex-[2] bg-[#25D366] hover:bg-[#20b858] text-white py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-[0.98]"><Phone className="w-3.5 h-3.5 fill-white" /><span>إرسال عبر واتساب</span></button>
                  </div>
                  <button onClick={() => setIsCartOpen(false)} className="w-full bg-white text-red-600 border-2 border-red-500 py-3 rounded-xl font-black text-xs sm:text-sm hover:bg-red-50 transition-colors">رجوع لمتابعة التسوق</button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full text-center shadow-2xl">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
            <h3 className="font-black text-base text-[#1e382b] mb-1.5">تأكيد مسح السلة</h3>
            <p className="text-xs font-bold text-slate-500 mb-4">هل أنت متأكد من مسح السلة بالكامل؟</p>
            <div className="flex gap-2.5">
              <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-sm text-slate-700">إلغاء</button>
              <button onClick={clearEntireCart} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm shadow-md">نعم، امسح</button>
            </div>
          </div>
        </div>
      )}

      {showRestoreConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full text-center shadow-2xl">
            <RotateCcw className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            <h3 className="font-black text-base text-[#1e382b] mb-1.5">استبدال السلة الحالية</h3>
            <p className="text-xs font-bold text-slate-500 mb-4">هل تريد استبدال سلتك الحالية بآخر طلب وتعديله؟</p>
            <div className="flex gap-2.5">
              <button onClick={() => setShowRestoreConfirm(false)} className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-sm text-slate-700">إلغاء</button>
              <button onClick={executeRestore} className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-md">استرجاع الطلب</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
