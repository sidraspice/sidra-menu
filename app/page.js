'use client';

import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import { 
  Search, ShoppingBag, Plus, Minus, Trash2, RefreshCw, X, Check, Phone, 
  User, MapPin, FileText, AlertCircle, ChevronRight, Sparkles, ShieldCheck, Ban, Image as ImageIcon, Share2, RotateCcw, Package
} from 'lucide-react';

const WHATSAPP_NUMBER = "201044760160";
const EDIT_WINDOW_MS = 96 * 60 * 60 * 1000;
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

const normalizeArabic = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىئ\u06CC\u0649]/g, 'ي')
    .replace(/[\u06A9گ]/g, 'ك')
    .replace(/ؤ/g, 'و')
    .replace(/[-_()/،,.٫!؟"'\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const stripDefiniteArticle = (word) => {
  if (word && word.length > 3 && word.startsWith('ال')) return word.slice(2);
  return word;
};

const ORTHOGRAPHIC_EQUIVALENTS = {
  'يانسون': 'ينسون',
  'ثوم': 'توم',
  'ذهب': 'دهب',
  'ذهبي': 'دهبي',
  'كسبره': 'كزبره',
  'بذور': 'بذر'
};

const normalizeOrthographicWord = (word) => {
  const stripped = stripDefiniteArticle(word);
  return ORTHOGRAPHIC_EQUIVALENTS[stripped] || stripped;
};

const SIMILAR_ARABIC_GROUPS = [
  'قك', 'سص', 'تط', 'دض', 'ذزظ', 'ثسص', 'هحخ', 'عغ', 'بف', 'نلر', 'شس', 'تث', 'جحخ', 'طك'
];

const areArabicCharsClose = (c1, c2) => {
  if (c1 === c2) return true;
  for (let i = 0; i < SIMILAR_ARABIC_GROUPS.length; i++) {
    if (SIMILAR_ARABIC_GROUPS[i].includes(c1) && SIMILAR_ARABIC_GROUPS[i].includes(c2)) return true;
  }
  return false;
};

const getTypoScore = (qWord, targetWord) => {
  if (!qWord || !targetWord) return 0;
  const lq = qWord.length;
  const lt = targetWord.length;

  if (lq < 4 || lt < 3) return 0;
  if (Math.abs(lq - lt) > 1) return 0;

  if (lq === lt) {
    const diffs = [];
    for (let i = 0; i < lq; i++) {
      if (qWord[i] !== targetWord[i]) diffs.push(i);
      if (diffs.length > 2) return 0;
    }
    if (diffs.length === 1) {
      const idx = diffs[0];
      if (areArabicCharsClose(qWord[idx], targetWord[idx])) return 240;
      if (lq >= 5 && idx > 0 && qWord[0] === targetWord[0]) return 200;
      return 0;
    }
    if (diffs.length === 2 && diffs[1] === diffs[0] + 1) {
      if (qWord[diffs[0]] === targetWord[diffs[0] + 1] && qWord[diffs[0] + 1] === targetWord[diffs[0]]) return 220;
    }
    return 0;
  }

  const shorter = lq < lt ? qWord : targetWord;
  const longer = lq < lt ? targetWord : qWord;
  if (shorter.length < 4 || shorter[0] !== longer[0]) return 0;

  for (let i = 1; i < longer.length; i++) {
    if (longer.slice(0, i) + longer.slice(i + 1) === shorter) return 210;
  }
  return 0;
};

const scoreProductMatch = (itemIndex, queryMeta) => {
  const { normQ, compactQ, qWords, qWordsOrtho } = queryMeta;
  const { normName, compactName, nameWords, nameWordsOrtho, catWords, grindWords, normCode } = itemIndex;

  if (!normQ) return 0;
  if (normName === normQ || (compactQ.length >= 2 && compactName === compactQ)) return 1000;
  if (normCode && normCode === normQ) return 980;
  if (normName.startsWith(normQ + ' ')) return 950;

  if (qWords.length === 1) {
    const qw = qWords[0];
    const qwo = qWordsOrtho[0];
    for (let idx = 0; idx < nameWords.length; idx++) {
      if (nameWords[idx] === qw || nameWordsOrtho[idx] === qwo) {
        return idx === 0 ? 920 : Math.max(750, 830 - idx * 15);
      }
    }
  }

  if (normName.includes(normQ) || (compactQ.length >= 3 && compactName.includes(compactQ))) return 700;
  return 400;
};

export default function Home() {
  const [data, setData] = useState({ products: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
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
  const customWeightInputRef = useRef(null); 
  const grindSectionRef = useRef(null);
  
  const [grindOption, setGrindOption] = useState('');
  const [grindError, setGrindError] = useState(false);

  const [zoomedImage, setZoomedImage] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '' });

  const [currentStep, setCurrentStep] = useState('shop');
  const [customer, setCustomer] = useState({ name: '', phone: '', deliveryZone: '', paymentMethod: '', address: '', notes: '' });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSearchModeActive = Boolean(isSearchOpen || search.trim().length > 0);
  const isAnyModalOpen = Boolean(isCartOpen || activeModalProduct || zoomedImage || showClearConfirm || showRestoreConfirm || showWelcomeBack);

  const historyPushedRef = useRef({ modal: false, search: false });

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.confetti && !document.querySelector('script[src*="canvas-confetti"]')) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isAnyModalOpen && !historyPushedRef.current.modal) {
      window.history.pushState({ sedraType: 'modal' }, '');
      historyPushedRef.current.modal = true;
    } else if (!isAnyModalOpen) {
      historyPushedRef.current.modal = false;
    }

    if (isSearchModeActive && !historyPushedRef.current.search) {
      window.history.pushState({ sedraType: 'search' }, '');
      historyPushedRef.current.search = true;
    } else if (!isSearchModeActive) {
      historyPushedRef.current.search = false;
    }

    const handlePopState = () => {
      if (zoomedImage) { setZoomedImage(null); historyPushedRef.current.modal = false; return; }
      if (showClearConfirm || showRestoreConfirm || showWelcomeBack) {
        if (showClearConfirm) setShowClearConfirm(false);
        if (showRestoreConfirm) setShowRestoreConfirm(false);
        if (showWelcomeBack) setShowWelcomeBack(false);
        historyPushedRef.current.modal = false;
        return;
      }
      if (activeModalProduct || isCartOpen) {
        if (activeModalProduct) setActiveModalProduct(null);
        if (isCartOpen) setIsCartOpen(false);
        historyPushedRef.current.modal = false;
        return;
      }
      if (isSearchModeActive) {
        setSearch('');
        setIsSearchOpen(false);
        if (searchInputRef.current) searchInputRef.current.blur();
        historyPushedRef.current.search = false;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAnyModalOpen, isSearchModeActive, zoomedImage, showClearConfirm, showRestoreConfirm, showWelcomeBack, activeModalProduct, isCartOpen]);

  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/products');
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) throw new Error('تعذر تحميل المنتجات');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      const mappedProducts = json.products.map(p => {
         const stockGrams = parseFloat(p['المخزون الحالي بالجرام']) || 0;
         const itemCode = p['كود الصنف'] || '';
         const image = p['صورة'] || p['صورة المنتج'] || p['رابط الصورة'] || p['image'] || '';
         let status = (p['حالة الصنف'] || '').toString().trim();
         
         let isAvailable = true;
         if (status === 'غير متوفر') isAvailable = false;
         else if (stockGrams <= 0) isAvailable = false;
         
         return { ...p, stockGrams, itemCode, image, isAvailable };
      });

      setData({ products: mappedProducts, categories: json.categories });
      try {
        localStorage.setItem('sedra_products_cache', JSON.stringify({ products: mappedProducts, categories: json.categories }));
      } catch (e) { console.error(e); }
    } catch (err) {
      if (!isBackground) setError(err.message || 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let hasLocalCache = false;
    try {
      const savedProducts = localStorage.getItem('sedra_products_cache');
      if (savedProducts) {
        const parsed = JSON.parse(savedProducts);
        if (parsed?.products && Array.isArray(parsed.products) && parsed.products.length > 0) {
          setData({ products: parsed.products, categories: parsed.categories || [] });
          setLoading(false);
          hasLocalCache = true;
        }
      }
    } catch (e) { console.error(e); }
    fetchData(hasLocalCache);
  }, []);

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
        const savedZone = parsed.deliveryZone || '';
        const savedPayment = parsed.paymentMethod || '';
        setCustomer({ 
          name: parsed.name || '', 
          phone: parsed.phone || '', 
          deliveryZone: savedZone, 
          paymentMethod: (savedZone === 'outside' && savedPayment === 'نقدًا') ? '' : savedPayment,
          address: parsed.address || '', 
          notes: '' 
        });
      }
    } catch (e) { console.error(e); }
  }, []);

  const openSearchMode = () => {
    setIsSearchOpen(true);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => { if (searchInputRef.current) searchInputRef.current.focus(); }, 60);
  };

  const closeSearchMode = () => {
    setSearch('');
    setIsSearchOpen(false);
    if (searchInputRef.current) searchInputRef.current.blur();
    if (typeof window !== 'undefined' && historyPushedRef.current.search) {
      historyPushedRef.current.search = false;
      window.history.back();
    }
  };

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

  const indexedProducts = useMemo(() => {
    return data.products.map((product, originalIndex) => {
      const normName = normalizeArabic(product.name || '');
      const compactName = normName.replace(/\s+/g, '');
      const nameWords = normName ? normName.split(' ') : [];
      const nameWordsOrtho = nameWords.map(normalizeOrthographicWord);
      const normCat = normalizeArabic(product.category || '');
      const catWords = normCat ? normCat.split(' ').map(normalizeOrthographicWord) : [];
      const rawGrind = product.grindOptions || product['حالة الطحن'] || '';
      const normGrind = normalizeArabic(rawGrind);
      const grindWords = normGrind ? normGrind.split(' ').map(normalizeOrthographicWord) : [];
      const normCode = normalizeArabic(product.itemCode || '');

      return {
        product,
        originalIndex,
        searchIndex: { normName, compactName, nameWords, nameWordsOrtho, catWords, grindWords, normCode }
      };
    });
  }, [data.products]);

  const filteredProducts = useMemo(() => {
    const trimmedSearch = deferredSearch.trim();
    if (!trimmedSearch) {
      return data.products.filter(item => {
        if (selectedCategory === 'فرص خاصة') {
          return item.variants.some(v => isOfferValid(v.price, v.originalPrice));
        }
        return selectedCategory === 'كل المنتجات' || item.category === selectedCategory;
      });
    }

    const normQ = normalizeArabic(trimmedSearch);
    if (!normQ) return [];

    const compactQ = normQ.replace(/\s+/g, '');
    const qWords = normQ.split(' ').filter(Boolean);
    const qWordsOrtho = qWords.map(normalizeOrthographicWord);
    const queryMeta = { normQ, compactQ, qWords, qWordsOrtho };

    const scoredResults = [];
    for (let i = 0; i < indexedProducts.length; i++) {
      const entry = indexedProducts[i];
      const score = scoreProductMatch(entry.searchIndex, queryMeta);
      if (score > 0) {
        scoredResults.push({ product: entry.product, score, originalIndex: entry.originalIndex });
      }
    }

    scoredResults.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.originalIndex - b.originalIndex;
    });

    return scoredResults.map(r => r.product);
  }, [data.products, indexedProducts, selectedCategory, deferredSearch]);

  const openProductModal = (product) => {
    const rawGrindData = product.grindOptions || product['حالة الطحن'] || '';
    let parsedOptions = [];
    if (rawGrindData && typeof rawGrindData === 'string') {
      parsedOptions = rawGrindData.split('|').map(s => s.trim()).filter(Boolean);
    }
    setActiveModalProduct({ ...product, parsedGrindOptions: parsedOptions });
    setSelectedVariant(product.variants.find(v => v.available) || product.variants[0] || null);
    setModalQty(1);
    setIsCustomWeight(false);
    setCustomWeightValue('');
    setGrindError(false);
    setGrindOption(parsedOptions.length === 1 ? parsedOptions[0] : '');
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

    let finalWeight = selectedVariant.weight;
    let finalPrice = selectedVariant.price;
    let finalOriginalPrice = isOfferValid(selectedVariant.price, selectedVariant.originalPrice) ? selectedVariant.originalPrice : null;
    let unitWeightGrams = getWeightNumberInGrams(selectedVariant.weight);

    if (isCustomWeight) {
      const parsedWeight = parseFloat(customWeightValue);
      if (!parsedWeight || parsedWeight <= 0) return;
      unitWeightGrams = parsedWeight;
      finalWeight = `${parsedWeight} جرام`;
      finalPrice = getCalculatedPrice();
      finalOriginalPrice = getCalculatedOriginalPrice();
    }

    let requestedGrams = unitWeightGrams * modalQty;
    let alreadyInCartGrams = cart.reduce((total, item) => {
        const itemPId = item.productId || item.key.split('_')[0];
        if (itemPId == activeModalProduct.id) return total + (item.unitWeightGrams * item.qty);
        return total;
    }, 0);

    if ((requestedGrams + alreadyInCartGrams) > activeModalProduct.stockGrams) {
        setToast({ visible: true, message: `الكمية المطلوبة أكبر من المتاح. المتاح: ${activeModalProduct.stockGrams} جرام.` });
        setTimeout(() => setToast({ visible: false, message: '' }), 3000);
        return;
    }

    triggerVibration(); 
    triggerFlyingAnimation(e, activeModalProduct.image || '/logo.png');

    const finalName = grindOption ? `${activeModalProduct.name} (${grindOption})` : activeModalProduct.name;
    const itemKey = `${activeModalProduct.id}_${finalWeight}_${grindOption || 'default'}`;
    
    setCart(prev => {
      const exists = prev.find(i => i.key === itemKey);
      if (exists) return prev.map(i => i.key === itemKey ? { ...i, qty: i.qty + modalQty } : i);
      return [...prev, { 
        key: itemKey, productId: activeModalProduct.id, itemCode: activeModalProduct.itemCode, 
        name: finalName, category: activeModalProduct.category, weight: finalWeight, 
        unitWeightGrams: unitWeightGrams, grindOption: grindOption, price: finalPrice, 
        originalPrice: finalOriginalPrice, qty: modalQty 
      }];
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

  const validateForm = () => {
    const errors = {};
    if (!customer.name.trim()) errors.name = 'يرجى إدخال الاسم الكامل';
    const cleanPhone = customer.phone.replace(/\s+/g, '');
    if (!cleanPhone || !/^01[0125][0-9]{8}$/.test(cleanPhone)) errors.phone = 'رقم هاتف غير صحيح';
    if (!customer.deliveryZone) errors.deliveryZone = 'من فضلك اختر مكان التوصيل.';
    if (!customer.paymentMethod || customer.paymentMethod === 'اختر طريقة الدفع') errors.paymentMethod = 'اختر طريقة الدفع.';
    if (!customer.address.trim()) errors.address = 'يرجى إدخال العنوان';
    
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      triggerVibration();
      return false;
    }
    return true;
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
      setCustomer(prev => ({
        ...prev,
        deliveryZone: lastOrder.deliveryZone || prev.deliveryZone || '',
        paymentMethod: lastOrder.paymentMethod || prev.paymentMethod || ''
      }));
      setIsEditing(true);
      setShowRestoreConfirm(false);
      setToast({ visible: true, message: 'تم استرجاع الطلب لتعديله' });
      setTimeout(() => setToast({ visible: false, message: '' }), 2500);
    }
  };

  const handleSendWhatsAppOrder = async () => {
    if (!validateForm()) {
      setCurrentStep('checkout');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      
      let orderId = `SD-${dd}/${mm}-${hh}:${mins}`;
      if (lastOrder && (lastOrder.id === orderId || lastOrder.id.startsWith(`${orderId}-`))) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        orderId = `${orderId}-${chars.charAt(Math.floor(Math.random() * chars.length))}`;
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, customer, paymentMethod: customer.paymentMethod, cart, totalAmount })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) throw new Error(resData.error || 'فشل تسجيل الطلب');

      let message = isEditing ? `🔄 تعديل على الطلب السابق من متجر عطارة سدرة\n` : `🛒 طلب جديد من متجر عطارة سدرة\n`;
      message += `🏷️ رقم الطلب: ${orderId}\n\n`;
      message += `👤 الاسم: ${customer.name.trim()}\n📱 الهاتف: ${customer.phone.trim()}\n📍 التوصيل: ${customer.deliveryZone === 'damanhour' ? 'داخل دمنهور' : 'خارج دمنهور'}\n📍 العنوان: ${customer.address.trim()}\n`;
      if (customer.notes.trim()) message += `📝 ملاحظات: ${customer.notes.trim()}\n`;
      message += `\n📦 المنتجات المطلوبة:\n\n`;
      
      let totalWeightGrams = 0;
      cart.forEach((item, index) => {
        totalWeightGrams += (item.unitWeightGrams * item.qty);
        const itemTotal = (item.price * item.qty).toFixed(2);
        message += `*${index + 1}. ${item.name}*\n   🔷 الوزن: ${getCalculatedTotalWeight(item.weight, item.qty)}\n   🔷 السعر: *${itemTotal} جنيه*\n\n`;
      });

      message += `────────────\n\n⚖️ إجمالي الوزن: ${totalWeightGrams < 1000 ? `${totalWeightGrams} جرام` : `${totalWeightGrams / 1000} كجم`}\n`;
      message += `💰 إجمالي الفاتورة: ${totalAmount} جنيه\n💳 طريقة الدفع: ${customer.paymentMethod}\n`;
      if (customer.paymentMethod === 'InstaPay' || customer.paymentMethod === 'محفظة كاش') {
        message += `📲 رقم التحويل: *01009750003*\n`;
      }
      if (customer.deliveryZone === 'damanhour' && currentTotalNumber >= FREE_DELIVERY_THRESHOLD) {
        message += `🎁 *التوصيل مجاني (حساب المندوب علينا)*\n`;
      }

      if (resData.adminLink) {
        message += `\n\n────────────\n⚙️ *إدارة المتجر*\n🔗 لتأكيد الطلب اضغط هنا:\n${resData.adminLink}`;
      }

      const orderData = { 
        id: orderId, items: cart, deliveryZone: customer.deliveryZone, paymentMethod: customer.paymentMethod,
        customer: { name: customer.name, phone: customer.phone, deliveryZone: customer.deliveryZone, address: customer.address },
        createdAt: isEditing ? lastOrder.createdAt : Date.now(), 
        expiresAt: isEditing ? lastOrder.expiresAt : Date.now() + EDIT_WINDOW_MS 
      };
      
      localStorage.setItem('sedra_last_order', JSON.stringify(orderData));
      setLastOrder(orderData);
      
      const cleanPhone = WHATSAPP_NUMBER.replace(/\D/g, '');
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      
      if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
        window.location.href = waUrl;
      } else {
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      }

      setCart([]);
      setIsEditing(false);
      setCustomer(prev => ({ ...prev, notes: '', deliveryZone: '', paymentMethod: '' }));
      setIsCartOpen(false);
      setCurrentStep('cart');
    } catch (error) {
      setToast({ visible: true, message: error.message || "تعذر تسجيل الطلب." });
      setTimeout(() => setToast({ visible: false, message: '' }), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-36 text-slate-800 selection:bg-brand-accent selection:text-white bg-[#fbf9f4] relative">
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

      <div className={`fixed left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 pointer-events-none flex items-center gap-2.5 bg-white text-gray-800 border-r-4 border-emerald-500 shadow-2xl rounded-xl px-4 py-3 w-max max-w-[90vw] ${toast.visible ? 'bottom-28 opacity-100' : 'bottom-16 opacity-0'}`}>
        <div className="bg-emerald-100 rounded-full p-1"><Check className="w-4 h-4 text-emerald-600 stroke-[3]" /></div>
        <span className="font-bold text-sm truncate text-slate-700">{toast.message}</span>
      </div>

      <header className="pt-2 pb-0 px-4 max-w-xl mx-auto flex flex-col items-center justify-center">
        <div className="w-full max-w-[340px] sm:max-w-[380px] bg-white rounded-3xl p-2 shadow-sm border border-[#e8e2d5] flex flex-col items-center">
          <div className="w-full aspect-[16/10] rounded-2xl overflow-hidden flex items-center justify-center bg-white"><img src="/logo.png" alt="عطارة سدرة" className="w-full h-full object-cover" /></div>
          <div style={{ background: 'linear-gradient(135deg, #173023 0%, #224432 50%, #173023 100%)', border: '2px solid #d4af37' }} className="w-full mt-1.5 mb-0 py-1.5 px-3 rounded-2xl flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-[#d4af37] shrink-0 animate-pulse" />
            <span className="text-[14px] sm:text-base font-black text-[#fff4d6] tracking-wide text-center leading-tight">ما تدفعش ولا جنيه غير بعد المعاينة</span>
            <ShieldCheck className="w-5 h-5 text-[#d4af37] shrink-0" />
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-3 sm:px-4 mt-2">
        <div className="sticky top-0 z-30 bg-[#fbf9f4] -mx-3 sm:-mx-4 px-3 sm:px-4 pt-2 pb-2.5 mb-3 border-b border-[#e8e2d5] shadow-xs">
          {isEditing && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2 mb-2 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" style={{ animationDuration: '3s' }} />
                <div>
                  <h4 className="text-amber-800 text-xs font-black">تعديل الطلب السابق</h4>
                  <p className="text-amber-700 text-[10px] font-bold">({lastOrder?.id})</p>
                </div>
              </div>
              <button onClick={() => { setIsEditing(false); setCart([]); }} className="text-red-600 hover:text-red-800 text-[10px] font-black underline">إلغاء</button>
            </div>
          )}

          {!isSearchModeActive ? (
            <div className="flex items-center gap-1.5 mb-2">
              <button
                type="button"
                onClick={openSearchMode}
                className="flex-1 bg-white rounded-2xl shadow-xs p-2.5 flex items-center justify-between gap-1.5 border-2 border-[#e8e2d5] hover:border-[#2d533e] transition text-right"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-[#2d533e]/10 flex items-center justify-center shrink-0">
                    <Search className="w-4 h-4 text-[#2d533e]" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-500 truncate">ابحث عن صنف بالاسم...</span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-black text-[#2d533e] bg-[#fbf9f4] px-2 py-1 rounded-lg border border-[#e8e2d5] shrink-0">بحث 🔍</span>
              </button>

              <a
                href="/track"
                className="bg-white hover:bg-[#fbf9f4] text-[#1e382b] border-2 border-[#e8e2d5] text-xs font-bold px-2.5 py-2.5 rounded-2xl transition shadow-xs flex items-center gap-1 shrink-0"
                title="متابعة الطلب"
              >
                <Package className="w-4 h-4 text-[#2d533e]" />
                <span className="text-[11px]">المتابعة</span>
              </a>

              {lastOrder && !isEditing && (
                <button onClick={handleRestoreOrderRequest} className="bg-[#2d533e] hover:bg-[#1e382b] text-white text-xs font-bold px-2.5 py-2.5 rounded-2xl transition shadow-sm flex items-center gap-1 shrink-0">
                  <RotateCcw className="w-3.5 h-3.5 text-[#c89d56]" />
                  <span className="text-[11px]">تعديل</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 bg-white rounded-2xl shadow-sm p-2 flex items-center gap-2 border-2 border-[#2d533e]">
                <Search className="w-5 h-5 text-[#2d533e] mr-1 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') closeSearchMode(); }}
                  placeholder="اكتب اسم الصنف للبحث..."
                  className="w-full bg-transparent focus:outline-none text-sm font-bold text-[#1e382b]"
                />
                {search && (
                  <button type="button" onClick={() => { setSearch(''); if (searchInputRef.current) searchInputRef.current.focus(); }} className="px-2 py-1 text-[11px] font-black text-slate-500 bg-slate-100 rounded-lg">مسح</button>
                )}
              </div>
              <button type="button" onClick={closeSearchMode} className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          )}

          {!isSearchModeActive && displayCategories.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 pt-0.5">
              {displayCategories.map(cat => {
                const isSelected = selectedCategory === cat;
                const isOfferBtn = cat === 'فرص خاصة';
                const visual = getCategoryVisual(cat);
                
                let btnStyle = {};
                let textClass = '';

                if (isOfferBtn) {
                  if (isSelected) {
                    btnStyle = { background: 'linear-gradient(135deg, #d63031 0%, #ff7675 100%)', border: '1.5px solid #ff7675', color: '#ffffff' };
                    textClass = 'text-white';
                  } else {
                    btnStyle = { background: 'linear-gradient(135deg, #fff0f0 0%, #ffe3e3 100%)', border: '1.5px solid #ff7675', color: '#d63031' };
                    textClass = 'text-[#d63031]';
                  }
                } else {
                  if (isSelected) {
                    btnStyle = { background: 'linear-gradient(135deg, #1b3d2b 0%, #0e2417 100%)', border: '1.5px solid #d4af37', color: '#fff9ea' };
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
                    className="px-2.5 py-1.5 rounded-xl transition-all duration-200 flex items-center gap-1 active:scale-95 shadow-2xs shrink-0"
                  >
                    <span className="text-xs leading-none">{visual.icon}</span>
                    <span className={`text-[11px] sm:text-xs font-bold leading-tight whitespace-nowrap ${textClass}`}>{visual.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {loading && data.products.length === 0 && (
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4, 5, 6].map((sk) => (
              <div key={sk} className="bg-white rounded-2xl p-3 border border-[#e8e2d5] animate-pulse h-40"></div>
            ))}
          </div>
        )}

        {error && data.products.length === 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-center my-6">
            <p className="text-sm font-bold mb-2.5">{error}</p>
            <button onClick={() => fetchData(false)} className="bg-[#2d533e] text-white text-sm px-4 py-2 rounded-lg font-bold inline-flex items-center gap-1"><RefreshCw className="w-4 h-4" /> إعادة المحاولة</button>
          </div>
        )}

        {data.products.length > 0 && (
          <>
            {isSearchModeActive && !search.trim() ? (
              <div className="bg-white border border-[#e8e2d5] rounded-2xl p-6 text-center my-3">
                <div className="w-12 h-12 rounded-full bg-[#2d533e]/10 flex items-center justify-center mx-auto mb-2.5">
                  <Search className="w-6 h-6 text-[#2d533e]" />
                </div>
                <p className="text-sm sm:text-base font-black text-[#1e382b]">اكتب اسم الصنف للبحث</p>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-2 px-1">
                  {search.trim() ? (
                    <span className="text-xs font-black text-[#1e382b]">نتائج البحث عن &laquo;{search.trim()}&raquo; ({filteredProducts.length} منتج)</span>
                  ) : (
                    <span className="text-xs font-bold text-slate-500">{selectedCategory} ({filteredProducts.length} منتج)</span>
                  )}
                </div>

                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pb-16">
                    {filteredProducts.map((product, index) => (
                      <div key={product.id} className={`bg-white rounded-2xl p-2.5 sm:p-3 border shadow-2xs flex flex-col justify-between transition ${product.isAvailable ? 'border-[#e8e2d5] hover:shadow-sm' : 'border-red-100 bg-[#fffcfc]'}`}>
                        <div>
                          <div className="flex items-start gap-1.5 sm:gap-2 mb-2">
                            <div onClick={(e) => { e.stopPropagation(); if (product.image) setZoomedImage(product.image); }} className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-slate-100 border overflow-hidden shrink-0 relative cursor-pointer ${product.isAvailable ? 'border-[#e8e2d5]' : 'border-red-100 opacity-70'}`}>
                              {product.image ? (
                                <img src={product.image} alt={product.name} referrerPolicy="no-referrer" loading={index < 4 ? "eager" : "lazy"} decoding="async" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }} />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 bg-[#fbf9f4]"><ImageIcon className="w-5 h-5 text-[#4d7c60]/50" /></div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className={`text-[8px] sm:text-[9px] font-bold px-1 py-0.2 rounded border truncate max-w-[75%] ${product.isAvailable ? 'text-[#c89d56] bg-[#fbf9f4] border-[#e8e2d5]' : 'text-slate-400 bg-slate-50 border-slate-200'}`} title={product.category}>{product.category}</span>
                                <button onClick={(e) => handleShareProduct(product, e)} className="p-0.5 text-slate-400 hover:text-[#2d533e]" title="مشاركة"><Share2 className="w-3 h-3" /></button>
                              </div>
                              <h3 onClick={() => product.isAvailable && openProductModal(product)} className={`font-bold text-xs sm:text-sm line-clamp-2 leading-tight cursor-pointer hover:text-[#2d533e] ${product.isAvailable ? 'text-[#1e382b]' : 'text-slate-500'}`}>{product.name}</h3>
                            </div>
                          </div>
                        </div>

                        <div onClick={() => product.isAvailable && openProductModal(product)} className="cursor-pointer">
                          <div className="text-[10px] sm:text-[11px] text-slate-500 font-semibold mb-2">
                            {product.variants.map((v, i) => {
                              const hasOffer = isOfferValid(v.price, v.originalPrice);
                              return (
                                <div key={i} className="flex justify-between items-center py-1 border-t border-slate-50">
                                  <div className="flex items-center gap-1">
                                    <span className={`font-bold ${!v.available ? 'line-through text-slate-300' : 'text-slate-600'}`}>{v.weight}</span>
                                    {hasOffer && v.available && <span className="text-[8px] bg-red-600 text-white px-1 rounded font-bold">فرصة</span>}
                                  </div>
                                  <div className={`font-bold flex flex-col items-end justify-center ${v.available ? 'text-[#2d533e]' : 'text-slate-400'}`}>
                                    {v.available ? (
                                      <>
                                        {hasOffer && <span className="text-slate-400 line-through text-[9px] leading-none mb-0.5">{v.originalPrice} ج</span>}
                                        <span className="text-xs leading-none">{v.price} ج</span>
                                      </>
                                    ) : <span className="text-xs">0</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {product.isAvailable ? (
                            <button className="w-full bg-[#2d533e] text-white text-xs sm:text-sm py-2 rounded-xl font-black flex items-center justify-center gap-1 shadow-sm hover:bg-[#1e382b] transition"><Plus className="w-3.5 h-3.5" /> اختيار</button>
                          ) : (
                            <button disabled className="w-full bg-[#fff0f0] text-[#d63031] border border-[#ffcccc] text-xs sm:text-sm py-2 rounded-xl font-black flex items-center justify-center gap-1 opacity-90 cursor-not-allowed"><Ban className="w-3.5 h-3.5" /> غير متوفر</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white border border-[#e8e2d5] rounded-2xl p-6 text-center my-4 shadow-2xs">
                    <p className="text-sm font-black text-[#1e382b]">لم نجد صنفًا مطابقًا لبحثك.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {activeModalProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md h-[90vh] sm:h-auto sm:max-h-[95vh] rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
            <div className="px-4 py-3 border-b border-slate-100 shrink-0 bg-white z-10">
              <div className="flex items-start gap-3">
                {activeModalProduct.image && (
                  <div onClick={(e) => { e.stopPropagation(); setZoomedImage(activeModalProduct.image); }} className="w-12 h-12 rounded-xl bg-slate-100 border border-[#e8e2d5] overflow-hidden shrink-0 cursor-pointer">
                    <img src={activeModalProduct.image} alt={activeModalProduct.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 pr-1">
                  <span className="text-[10px] font-bold text-[#c89d56] block mb-0.5">{activeModalProduct.category}</span>
                  <h2 className="text-base font-black text-[#1e382b] leading-snug">{activeModalProduct.name}</h2>
                </div>
                <button onClick={() => setActiveModalProduct(null)} className="p-1.5 bg-slate-50 text-slate-400 hover:text-red-500 rounded-full"><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white pb-32">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-800 block border-b pb-1">الأوزان المتاحة</label>
                <div className="grid grid-cols-2 gap-2">
                  {activeModalProduct.variants.map((variant, idx) => {
                    const isSelected = !isCustomWeight && selectedVariant?.weight === variant.weight;
                    const displayWeight = isSelected ? getCalculatedTotalWeight(variant.weight, modalQty) : variant.weight;
                    const displayPrice = isSelected ? (variant.price * modalQty).toFixed(2) : variant.price;
                    const hasOffer = isOfferValid(variant.price, variant.originalPrice);
                    const displayOriginalPrice = isSelected && hasOffer ? (variant.originalPrice * modalQty).toFixed(2) : variant.originalPrice;

                    return (
                      <button key={idx} disabled={!variant.available} onClick={() => { triggerVibration(); setSelectedVariant(variant); setIsCustomWeight(false); }} className={`p-2.5 rounded-xl border-2 text-right transition relative ${!variant.available ? 'opacity-40 bg-slate-50 border-slate-200 cursor-not-allowed' : isSelected ? 'border-[#2d533e] bg-[#2d533e]/5 text-[#1e382b]' : 'border-[#e8e2d5] text-slate-700'}`}>
                        {hasOffer && variant.available && <span className="absolute -top-2.5 -left-2 bg-[#d63031] text-white text-[9px] px-1.5 py-0.5 rounded font-black border z-10">فرصة</span>}
                        <div className="text-xs font-black">{displayWeight}</div>
                        <div className="text-xs font-black text-[#2d533e] mt-0.5">
                          {variant.available ? <span>{displayPrice} ج</span> : <span>0</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div onClick={() => { triggerVibration(); setIsCustomWeight(true); setTimeout(() => { if(customWeightInputRef.current) customWeightInputRef.current.focus(); }, 50); }} className={`p-3 rounded-2xl border-2 cursor-pointer ${isCustomWeight ? 'border-[#2d533e] bg-white shadow-md' : 'border-[#e8e2d5] bg-[#fdfcfa]'}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isCustomWeight ? 'border-[#2d533e] bg-[#2d533e]' : 'border-slate-300'}`}>
                      {isCustomWeight && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className={`text-sm font-black ${isCustomWeight ? 'text-[#1e382b]' : 'text-slate-600'}`}>وزن مخصص بالجرام</span>
                  </div>
                  
                  {isCustomWeight && (
                    <div className="mt-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <input ref={customWeightInputRef} type="number" inputMode="numeric" value={customWeightValue} onChange={(e) => setCustomWeightValue(e.target.value.replace(/[^0-9]/g, ''))} placeholder="مثال: 250" className="flex-1 p-2 text-center text-base font-black border-2 border-slate-200 rounded-lg outline-none focus:border-[#2d533e]" />
                        <span className="text-xs font-black text-slate-600 bg-slate-100 px-3 py-2 rounded-lg">جرام</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {activeModalProduct.parsedGrindOptions && activeModalProduct.parsedGrindOptions.length > 0 && (
                <div ref={grindSectionRef} className={`space-y-2 ${grindError ? 'p-3 bg-red-50 border border-red-200 rounded-2xl' : ''}`}>
                  <span className={`text-xs font-black block mb-1 ${grindError ? 'text-red-700' : 'text-slate-800'}`}>حالة المنتج</span>
                  <div className="flex items-center gap-2">
                    {activeModalProduct.parsedGrindOptions.map((opt, i) => {
                      const isSelected = grindOption === opt;
                      return (
                        <button key={i} onClick={() => { triggerVibration(); setGrindOption(opt); setGrindError(false); }} className={`flex-1 py-2 px-2 rounded-xl border-2 font-black text-xs ${isSelected ? 'bg-[#2d533e] border-[#2d533e] text-white' : 'bg-white border-[#e8e2d5] text-slate-600'}`}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-xs font-black text-slate-800 block mb-1">الكمية</span>
                <div className="flex items-center gap-3 justify-center bg-slate-50 py-1 rounded-xl border">
                  <button onClick={() => { triggerVibration(); setModalQty(Math.max(1, modalQty - 1)); }} className="w-7 h-7 rounded-lg bg-white border flex items-center justify-center font-bold"><Minus className="w-3.5 h-3.5" /></button>
                  <span className="font-black text-base w-6 text-center">{modalQty}</span>
                  <button onClick={() => { triggerVibration(); setModalQty(modalQty + 1); }} className="w-7 h-7 rounded-lg bg-white border flex items-center justify-center font-bold"><Plus className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t bg-white z-20 shadow-lg">
              <button disabled={(!selectedVariant || !selectedVariant.available) || (isCustomWeight && (!customWeightValue || parseInt(customWeightValue) <= 0))} onClick={(e) => {
                if (activeModalProduct.parsedGrindOptions?.length > 1 && !grindOption) {
                  setGrindError(true);
                  triggerVibration();
                  return;
                }
                addToCart(e);
              }} className="w-full bg-[#2d533e] disabled:opacity-50 text-white py-3 rounded-xl font-black text-sm shadow-md">
                إضافة للسلة — {(getCalculatedPrice() * modalQty).toFixed(2)} جنيه
              </button>
            </div>
          </div>
        </div>
      )}

      {zoomedImage && (
        <div style={{ zIndex: 99999 }} className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-sm w-full bg-white rounded-3xl p-3 shadow-2xl flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setZoomedImage(null)} className="absolute top-4 left-4 z-20 p-2 bg-black/60 text-white rounded-full"><X className="w-5 h-5" /></button>
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center"><img src={zoomedImage} alt="صورة" referrerPolicy="no-referrer" className="w-full h-full object-contain" /></div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-2.5 bg-white/95 backdrop-blur-md border-t border-[#e8e2d5] z-30 shadow-[0_-4px_15px_rgba(0,0,0,0.08)] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="max-w-xl mx-auto flex items-center gap-2">
          <button ref={cartIconRef} onClick={() => { triggerVibration(); setCurrentStep('cart'); setIsCartOpen(true); }} className="w-full bg-[#1e382b] text-white p-3 rounded-2xl font-bold flex items-center justify-between shadow-lg active:scale-[0.99] transition">
            <div className="flex items-center gap-2">
              <div className="relative">
                <ShoppingBag className="w-5 h-5 text-[#c89d56]" />
                {totalItemsCount > 0 && <span className="absolute -top-2 -right-2 bg-[#c89d56] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-black">{totalItemsCount}</span>}
              </div>
              <span className="text-xs sm:text-sm font-black">سلة الطلبات</span>
            </div>
            <span className="text-xs sm:text-sm text-[#c89d56] font-black">{totalAmount} جنيه</span>
          </button>
        </div>
      </div>

      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md h-[90vh] sm:h-auto sm:max-h-[95vh] rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
            <div className="px-4 py-3 border-b shrink-0 bg-white z-10 flex justify-between items-center">
              <h2 className="text-sm font-black text-[#1e382b]">
                {currentStep === 'cart' && 'سلة المشتريات'}
                {currentStep === 'checkout' && 'بيانات توصيل الطلب'}
                {currentStep === 'review' && 'مراجعة الطلب قبل الإرسال'}
              </h2>
              {currentStep === 'cart' && cart.length > 0 && (
                <button onClick={() => setShowClearConfirm(true)} className="text-[11px] font-black text-red-600 px-2 py-1 bg-red-50 rounded-lg border border-red-200">مسح السلة</button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-white pb-32">
              {currentStep === 'cart' && (
                <div className="space-y-3">
                  {cart.length > 0 && customer.deliveryZone !== 'outside' && (
                    <div className="bg-white rounded-xl p-3 border border-slate-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1"><Package className="w-3.5 h-3.5 text-[#2d533e]"/> توصيل مجاني داخل دمنهور</span>
                        <span className="text-[11px] font-black text-[#2d533e]">{currentTotalNumber >= FREE_DELIVERY_THRESHOLD ? 'مؤهل للتوصيل المجاني 🎉' : `باقي ${remainingForFreeDelivery} ج`}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${currentTotalNumber >= FREE_DELIVERY_THRESHOLD ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${deliveryProgressPercent}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="divide-y divide-slate-100">
                    {cart.length === 0 ? <div className="text-center py-12 text-slate-400 font-bold text-sm">السلة فارغة حالياً</div> : (
                      cart.map(item => (
                        <div key={item.key} className="py-2.5 flex justify-between items-center gap-2">
                          <div className="flex-1">
                            <h4 className="font-black text-xs sm:text-sm text-[#1e382b]">{item.name}</h4>
                            <div className="text-[10px] text-slate-500 font-bold mt-0.5">الوزن: {getCalculatedTotalWeight(item.weight, item.qty)}</div>
                            <div className="text-xs text-[#2d533e] font-black mt-0.5">{(item.price * item.qty).toFixed(2)} جنيه</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => updateCartQty(item.key, -1)} className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-700"><Minus className="w-3 h-3" /></button>
                            <span className="text-xs font-black w-4 text-center">{item.qty}</span>
                            <button onClick={() => updateCartQty(item.key, 1)} className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-700"><Plus className="w-3 h-3" /></button>
                            <button onClick={() => removeCartItem(item.key)} className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center text-red-500 ml-0.5"><Trash2 className="w-3 h-3" /></button>
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
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">الاسم الكامل <span className="text-red-500">*</span></label>
                    <input type="text" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="أدخل اسمك بالكامل" className="w-full py-2.5 px-3 text-sm font-bold rounded-xl border-2 border-slate-200 focus:border-[#2d533e] outline-none" />
                  </div>
                  
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">رقم الهاتف <span className="text-red-500">*</span></label>
                    <input type="tel" dir="ltr" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="01012345678" className="w-full py-2.5 px-3 text-sm font-bold rounded-xl border-2 border-slate-200 focus:border-[#2d533e] outline-none text-right" />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">مكان التوصيل <span className="text-red-500">*</span></label>
                    <div className="flex gap-2 w-full">
                      <button type="button" onClick={() => { triggerVibration(); setCustomer(prev => ({ ...prev, deliveryZone: 'damanhour' })); }} className={`flex-1 py-2.5 rounded-xl border-2 font-black text-xs flex items-center justify-center gap-1 ${customer.deliveryZone === 'damanhour' ? 'bg-[#2d533e] border-[#2d533e] text-white' : 'bg-white border-[#e8e2d5] text-slate-600'}`}>
                        داخل دمنهور
                      </button>
                      <button type="button" onClick={() => { triggerVibration(); setCustomer(prev => ({ ...prev, deliveryZone: 'outside', paymentMethod: prev.paymentMethod === 'نقدًا' ? '' : prev.paymentMethod })); }} className={`flex-1 py-2.5 rounded-xl border-2 font-black text-xs flex items-center justify-center gap-1 ${customer.deliveryZone === 'outside' ? 'bg-[#2d533e] border-[#2d533e] text-white' : 'bg-white border-[#e8e2d5] text-slate-600'}`}>
                        خارج دمنهور
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">طريقة الدفع <span className="text-red-500">*</span></label>
                    <select value={customer.paymentMethod || ''} onChange={(e) => setCustomer({ ...customer, paymentMethod: e.target.value })} className="w-full py-2.5 px-3 text-sm font-bold rounded-xl border-2 bg-white border-slate-200 focus:border-[#2d533e] text-[#1e382b] outline-none">
                      <option value="">اختر طريقة الدفع</option>
                      <option value="InstaPay">InstaPay</option>
                      <option value="محفظة كاش">محفظة كاش</option>
                      {customer.deliveryZone !== 'outside' && <option value="نقدًا">نقدًا</option>}
                      <option value="تحويل بنكي">تحويل بنكي</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">العنوان بالتفصيل <span className="text-red-500">*</span></label>
                    <textarea rows={2} value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} placeholder="المحافظة - المدينة - المنطقة - الشارع - رقم المنزل" className="w-full py-2.5 px-3 text-sm font-bold rounded-xl border-2 border-slate-200 focus:border-[#2d533e] outline-none resize-none" />
                  </div>
                  
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">ملاحظات (اختياري)</label>
                    <textarea rows={2} value={customer.notes} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} placeholder="ملاحظات على التوصيل..." className="w-full py-2.5 px-3 text-sm font-bold rounded-xl border-2 border-slate-200 focus:border-[#2d533e] outline-none resize-none" />
                  </div>
                </form>
              )}

              {currentStep === 'review' && (
                <div className="space-y-3 pb-2">
                  <div className="bg-[#fbf9f4] p-3 rounded-2xl border border-[#e8e2d5]">
                    <h4 className="text-xs font-black text-[#1e382b] mb-2 pb-1 border-b">بيانات العميل والتوصيل:</h4>
                    <div className="text-xs space-y-1.5 text-slate-700 font-semibold">
                      <div><strong>الاسم:</strong> {customer.name}</div>
                      <div><strong>الهاتف:</strong> {customer.phone}</div>
                      <div><strong>مكان التوصيل:</strong> {customer.deliveryZone === 'damanhour' ? 'داخل دمنهور' : 'خارج دمنهور'}</div>
                      <div><strong>طريقة الدفع:</strong> {customer.paymentMethod}</div>
                      <div><strong>العنوان:</strong> {customer.address}</div>
                      {customer.notes && <div><strong>ملاحظات:</strong> {customer.notes}</div>}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs">
                    <h4 className="text-xs font-black text-[#1e382b] mb-2 pb-1 border-b">المنتجات المطلوبة في الطلب:</h4>
                    <div className="space-y-2 divide-y divide-slate-50">
                      {cart.map((item, idx) => (
                        <div key={idx} className="pt-2 first:pt-0 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-black text-[#1e382b] block">{item.name}</span>
                            <span className="text-[10px] text-slate-500 font-bold">{getCalculatedTotalWeight(item.weight, item.qty)}</span>
                          </div>
                          <span className="font-black text-[#2d533e]">{(item.price * item.qty).toFixed(2)} جنيه</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t bg-white shadow-md z-20">
              <div className="flex justify-between items-center font-black text-sm pb-2">
                <span className="text-slate-700">الإجمالي النهائي:</span>
                <span className="text-[#2d533e] text-base">{totalAmount} جنيه</span>
              </div>

              {currentStep === 'cart' && (
                <div className="flex flex-col gap-2">
                  <button disabled={cart.length === 0} onClick={() => setCurrentStep('checkout')} className="w-full bg-[#2d533e] disabled:opacity-50 text-white py-3 rounded-xl font-black text-xs flex items-center justify-center gap-1"><span>متابعة إتمام الطلب</span><ChevronRight className="w-3.5 h-3.5 rotate-180" /></button>
                  <button onClick={() => setIsCartOpen(false)} className="w-full bg-white text-red-600 border border-red-500 py-2.5 rounded-xl font-black text-xs">إغلاق</button>
                </div>
              )}

              {currentStep === 'checkout' && (
                <div className="flex flex-col gap-2">
                  <button form="checkout-form" type="submit" className="w-full bg-[#2d533e] text-white py-3 rounded-xl font-black text-xs flex items-center justify-center gap-1"><span>مراجعة الطلب</span><ChevronRight className="w-3.5 h-3.5 rotate-180" /></button>
                  <button onClick={() => setCurrentStep('cart')} className="w-full bg-slate-100 text-slate-700 py-2.5 rounded-xl font-black text-xs">رجوع للسلة</button>
                </div>
              )}

              {currentStep === 'review' && (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentStep('checkout')} className="flex-1 bg-slate-100 text-[#1e382b] py-2.5 rounded-xl font-black text-xs">تعديل البيانات</button>
                    <button disabled={isSubmitting} onClick={handleSendWhatsAppOrder} className="flex-[2] bg-[#25D366] text-white py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1 shadow-sm">
                      {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Phone className="w-3.5 h-3.5 fill-white" /><span>إرسال عبر واتساب</span></>}
                    </button>
                  </div>
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
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 font-bold text-xs">إلغاء</button>
              <button onClick={clearEntireCart} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-black text-xs">نعم، امسح</button>
            </div>
          </div>
        </div>
      )}

      {showRestoreConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full text-center shadow-2xl">
            <RotateCcw className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            <h3 className="font-black text-base text-[#1e382b] mb-1.5">استبدال السلة الحالية</h3>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowRestoreConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 font-bold text-xs">إلغاء</button>
              <button onClick={executeRestore} className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white font-black text-xs">استرجاع</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
