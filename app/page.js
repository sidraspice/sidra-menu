'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, ShoppingBag, Plus, Minus, Trash2, RefreshCw, X, Check, Phone, 
  AlertCircle, ChevronRight, Sparkles, ShieldCheck, Ban, Image as ImageIcon, Share2, RotateCcw, Package, Truck 
} from 'lucide-react';

const WHATSAPP_NUMBER = "201044760160";
const TRANSFER_NUMBER = "01009750003";
const EDIT_WINDOW_MS = 96 * 60 * 60 * 1000;
const FREE_DELIVERY_THRESHOLD = 500;

// قائمة النصوص المتحركة داخل مربع البحث للفت الانتباه
const SEARCH_PLACEHOLDERS = [
  "ابحث عن كركم ... 🌿",
  "ابحث عن جينسنج أحمر... ✨",
  "ابحث عن حبهان ... 🫙",
  "ابحث عن بهارات فراخ سدرة... 🌶️",
  "ابحث عن ينسون بلدي... ☕",
  "ابحث عن قرفة سيلانى... 🍃",
  "ابحث عن خلطة شاورما... 🧂"
];

// دالة اهتزاز الهاتف عند التفاعل
const triggerVibration = () => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(50);
  }
};

// تحويل الأرقام المشرقية (٠-٩) إلى أرقام إنجليزية لضمان صحة الفحص
const toEnglishDigits = (str) => {
  if (!str) return '';
  return str.toString().replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
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

// استخراج قيمة الوزن بالجرام مع دعم الأوزان اللفظية
const getWeightNumberInGrams = (weightStr) => {
  if (!weightStr) return 1;
  const str = toEnglishDigits(weightStr).toLowerCase();

  if (str.includes('نصف') || str.includes('نص')) return 500;
  if (str.includes('ربع')) return 250;
  if (str.includes('ثمن') || str.includes('تمن')) return 125;

  const match = str.match(/\d+(\.\d+)?/);
  let num = match ? parseFloat(match[0]) : 1;
  if (str.includes('كيلو') || str.includes('كجم') || str.includes('kg')) num *= 1000;
  return num;
};

// تنسيق عرض إجمالي الوزن بناءً على الكمية
const getCalculatedTotalWeight = (weightStr, qty = 1) => {
  if (!weightStr) return '';
  const unitGrams = getWeightNumberInGrams(weightStr);
  const totalGrams = unitGrams * qty;

  if (totalGrams >= 1000) {
    const kilos = totalGrams / 1000;
    return totalGrams % 1000 === 0 ? `${kilos} كيلو` : `${kilos.toFixed(2).replace(/\.00$/, '')} كيلو`;
  }
  return `${totalGrams} جرام`;
};

const isOfferValid = (price, originalPrice) => {
  return originalPrice != null && parseFloat(originalPrice) > parseFloat(price);
};

const getValidPaymentMethods = (deliveryZone) => {
  return deliveryZone === 'outside'
    ? ['InstaPay', 'محفظة كاش', 'تحويل بنكي']
    : ['InstaPay', 'محفظة كاش', 'نقدًا', 'تحويل بنكي'];
};

const getReservedStockGrams = (cart, productId) => {
  return cart.reduce((total, item) => {
    const itemPId = item.productId || item.key.split('_')[0];
    return itemPId == productId ? total + (item.unitWeightGrams * item.qty) : total;
  }, 0);
};

// --- دوال تطبيع النص العربي والبحث الذكي ---
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
  if (word && word.length > 3 && word.startsWith('ال')) {
    return word.slice(2);
  }
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

  if (lq < 4 || lt < 3 || Math.abs(lq - lt) > 1) return 0;

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
      const i = diffs[0];
      if (qWord[i] === targetWord[i + 1] && qWord[i + 1] === targetWord[i]) return 220;
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

    let bestPrefixScore = 0;
    for (let idx = 0; idx < nameWords.length; idx++) {
      if (nameWords[idx].startsWith(qw) || nameWordsOrtho[idx].startsWith(qwo)) {
        const lenDiff = Math.min(Math.abs(nameWordsOrtho[idx].length - qwo.length), 10);
        const base = idx === 0 ? 860 : Math.max(700, 760 - idx * 15);
        bestPrefixScore = Math.max(bestPrefixScore, base - lenDiff);
      }
    }
    if (bestPrefixScore > 0) return bestPrefixScore;
  }

  if (normName.startsWith(normQ) || (compactQ.length >= 3 && compactName.startsWith(compactQ))) return 800;
  if (normName.includes(normQ) || (compactQ.length >= 3 && compactName.includes(compactQ))) return 700;

  let totalTokenScore = 0;
  let matchedInNameCount = 0;
  let usedTypo = false;

  for (let i = 0; i < qWords.length; i++) {
    const qw = qWords[i];
    const qwo = qWordsOrtho[i];
    let bestForToken = 0;
    let tokenUsedTypo = false;
    let inName = false;

    for (let idx = 0; idx < nameWords.length; idx++) {
      const nw = nameWords[idx];
      const nwo = nameWordsOrtho[idx];

      if (nw === qw || nwo === qwo) {
        const s = idx === 0 ? 160 : 135;
        if (s > bestForToken) {
          bestForToken = s;
          inName = true;
          tokenUsedTypo = false;
        }
      } else if (nw.startsWith(qw) || nwo.startsWith(qwo)) {
        const lenDiff = Math.min(Math.abs(nwo.length - qwo.length), 10);
        const s = (idx === 0 ? 125 : 105) - lenDiff;
        if (s > bestForToken) {
          bestForToken = s;
          inName = true;
          tokenUsedTypo = false;
        }
      } else if (qw.length >= 2 && (nw.includes(qw) || nwo.includes(qwo))) {
        if (80 > bestForToken) {
          bestForToken = 80;
          inName = true;
          tokenUsedTypo = false;
        }
      } else {
        const ts = Math.max(getTypoScore(qw, nw), getTypoScore(qwo, nwo));
        if (ts > 0) {
          const s = Math.floor(ts / 4);
          if (s > bestForToken) {
            bestForToken = s;
            inName = true;
            tokenUsedTypo = true;
          }
        }
      }
    }

    if (bestForToken === 0 && qwo.length >= 2) {
      for (let g = 0; g < grindWords.length; g++) {
        if (grindWords[g] === qwo || grindWords[g].startsWith(qwo)) {
          bestForToken = 50;
          break;
        }
      }
    }

    if (bestForToken === 0 && qwo.length >= 2) {
      for (let c = 0; c < catWords.length; c++) {
        if (catWords[c] === qwo || catWords[c].startsWith(qwo)) {
          bestForToken = 40;
          break;
        }
      }
    }

    if (bestForToken === 0) return 0;
    if (tokenUsedTypo) usedTypo = true;
    if (inName) matchedInNameCount++;
    totalTokenScore += bestForToken;
  }

  if (matchedInNameCount === 0 && qWords.length > 1) return 0;
  if (usedTypo) return Math.min(280, 150 + totalTokenScore);
  return Math.min(640, 350 + totalTokenScore);
};

export default function Home() {
  const [data, setData] = useState({ products: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState('كل المنتجات');
  
  // مؤشر النص المتحرك للفت الانتباه داخل مربع البحث
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

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

  const isSearchModeActive = isSearchOpen || search.trim().length > 0;
  const isAnyModalOpen = Boolean(isCartOpen || activeModalProduct || zoomedImage || showClearConfirm || showRestoreConfirm || showWelcomeBack);

  // تبديل تلقائي للنصوص التوضيحية داخل البحث كل 2.5 ثانية
  useEffect(() => {
    if (isSearchModeActive) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isSearchModeActive]);

  // تحميل سكريبت الاحتفال بشكل آمن
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.confetti && !document.getElementById('canvas-confetti-script')) {
      const script = document.createElement('script');
      script.id = 'canvas-confetti-script';
      script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // إدارة تاريخ المتصفح
  useEffect(() => {
    if (isSearchModeActive) {
      window.history.pushState({ sedraSearch: true }, '');
    }
  }, [isSearchModeActive]);

  useEffect(() => {
    if (isAnyModalOpen) {
      window.history.pushState({ modal: true }, '');
    }
  }, [isAnyModalOpen]);

  useEffect(() => {
    const handlePopState = () => {
      if (zoomedImage) {
        setZoomedImage(null);
        return;
      }
      if (showClearConfirm || showRestoreConfirm || showWelcomeBack) {
        setShowClearConfirm(false);
        setShowRestoreConfirm(false);
        setShowWelcomeBack(false);
        return;
      }
      if (activeModalProduct) {
        setActiveModalProduct(null);
        return;
      }
      if (isCartOpen) {
        if (currentStep === 'review') {
          setCurrentStep('checkout');
          return;
        }
        if (currentStep === 'checkout') {
          setCurrentStep('cart');
          return;
        }
        setIsCartOpen(false);
        return;
      }
      if (isSearchModeActive) {
        setSearch('');
        setIsSearchOpen(false);
        if (searchInputRef.current) searchInputRef.current.blur();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAnyModalOpen, isSearchModeActive, zoomedImage, showClearConfirm, showRestoreConfirm, showWelcomeBack, activeModalProduct, isCartOpen, currentStep]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('تعذر تحميل المنتجات (خطأ في الاستجابة)');
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      const mappedProducts = json.products.map(p => {
        const stockGrams = parseFloat(p['المخزون الحالي بالجرام']) || 0;
        const itemCode = p['كود الصنف'] || '';
        const image = p['صورة'] || p['صورة المنتج'] || p['رابط الصورة'] || p['image'] || '';
        let status = (p['حالة الصنف'] || '').toString().trim();
        
        let isAvailable = true;
        if (status === 'غير متوفر' || stockGrams <= 0) {
          isAvailable = false;
        }
        
        return { 
          ...p, 
          stockGrams, 
          itemCode, 
          image, 
          isAvailable 
        };
      });

      setData({ products: mappedProducts, categories: json.categories });
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
          else { 
            localStorage.removeItem('sedra_last_order'); 
            setLastOrder(null); 
            setIsEditing(false); 
          }
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
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const closeSearchMode = () => {
    setSearch('');
    setIsSearchOpen(false);
    if (searchInputRef.current) searchInputRef.current.blur();
    if (typeof window !== 'undefined' && window.history.state?.sedraSearch) {
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
        searchIndex: {
          normName,
          compactName,
          nameWords,
          nameWordsOrtho,
          catWords,
          grindWords,
          normCode
        }
      };
    });
  }, [data.products]);

  const filteredProducts = useMemo(() => {
    const trimmedSearch = search.trim();

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
    let maxScore = 0;

    for (let i = 0; i < indexedProducts.length; i++) {
      const entry = indexedProducts[i];
      const score = scoreProductMatch(entry.searchIndex, queryMeta);
      if (score > 0) {
        if (score > maxScore) maxScore = score;
        scoredResults.push({ product: entry.product, score, originalIndex: entry.originalIndex });
      }
    }

    const finalResults = maxScore >= 750
      ? scoredResults.filter(r => r.score >= 300)
      : scoredResults;

    finalResults.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.originalIndex - b.originalIndex;
    });

    return finalResults.map(r => r.product);
  }, [data.products, indexedProducts, selectedCategory, search]);

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

  // حساب سعر الجرام للوزن المخصص مباشرة من سعر الكيلو
  const getCustomWeightBaseRate = () => {
    if (!activeModalProduct) return { pricePerGram: 0, originalPricePerGram: null };
    
    if (activeModalProduct.kiloPrice) {
      return {
        pricePerGram: activeModalProduct.kiloPrice / 1000,
        originalPricePerGram: activeModalProduct.originalKiloPrice ? (activeModalProduct.originalKiloPrice / 1000) : null
      };
    }

    if (!activeModalProduct.variants?.length) return { pricePerGram: 0, originalPricePerGram: null };
    const availableVariants = activeModalProduct.variants.filter(v => v.available);
    const targetVariant = availableVariants.length > 0 ? availableVariants[0] : activeModalProduct.variants[0];
    const grams = getWeightNumberInGrams(targetVariant.weight);
    
    return {
      pricePerGram: targetVariant.price / grams,
      originalPricePerGram: isOfferValid(targetVariant.price, targetVariant.originalPrice) ? (targetVariant.originalPrice / grams) : null
    };
  };

  const getCalculatedPrice = () => {
    if (!selectedVariant) return 0;
    if (!isCustomWeight) return selectedVariant.price;
    const { pricePerGram } = getCustomWeightBaseRate();
    const grams = parseFloat(customWeightValue) || 0;
    return parseFloat((pricePerGram * grams).toFixed(2));
  };

  const getCalculatedOriginalPrice = () => {
    if (!selectedVariant) return null;
    if (!isCustomWeight) {
      return isOfferValid(selectedVariant.price, selectedVariant.originalPrice) ? selectedVariant.originalPrice : null;
    }
    const { originalPricePerGram } = getCustomWeightBaseRate();
    if (!originalPricePerGram) return null;
    const grams = parseFloat(customWeightValue) || 0;
    return parseFloat((originalPricePerGram * grams).toFixed(2));
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

    const requestedGrams = unitWeightGrams * modalQty;
    const alreadyInCartGrams = getReservedStockGrams(cart, activeModalProduct.id);

    if ((requestedGrams + alreadyInCartGrams) > activeModalProduct.stockGrams) {
      setToast({ visible: true, message: `الكمية المطلوبة أكبر من المتاح حالياً. المتاح: ${activeModalProduct.stockGrams} جرام.` });
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
        key: itemKey, 
        productId: activeModalProduct.id, 
        itemCode: activeModalProduct.itemCode, 
        name: finalName, 
        category: activeModalProduct.category, 
        weight: finalWeight, 
        unitWeightGrams: unitWeightGrams, 
        grindOption: grindOption, 
        price: finalPrice, 
        originalPrice: finalOriginalPrice, 
        qty: modalQty 
      }];
    });
    
    setActiveModalProduct(null);
    setToast({ visible: true, message: `تمت إضافة "${finalName}" بنجاح` });
    setTimeout(() => setToast({ visible: false, message: '' }), 2500);
  };

  const updateCartQty = (key, delta) => {
    triggerVibration();

    if (delta > 0) {
      const itemToUpdate = cart.find(i => i.key === key);
      if (itemToUpdate) {
        const itemPId = itemToUpdate.productId || itemToUpdate.key.split('_')[0];
        const product = data.products.find(p => p.id == itemPId);
        if (product) {
          const alreadyInCartGrams = getReservedStockGrams(cart, product.id);
          if ((alreadyInCartGrams + itemToUpdate.unitWeightGrams) > product.stockGrams) {
            setToast({ visible: true, message: `الكمية المطلوبة أكبر من المتاح حالياً. المتاح: ${product.stockGrams} جرام.` });
            setTimeout(() => setToast({ visible: false, message: '' }), 3000);
            return; 
          }
        }
      }
    }

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
    
    const cleanPhone = toEnglishDigits(customer.phone).replace(/\s+/g, '');
    if (!cleanPhone || !/^01[0125][0-9]{8}$/.test(cleanPhone)) {
      errors.phone = 'رقم هاتف غير صحيح (يجب أن يبدأ بـ 01 ويتكون من 11 رقم)';
    }
    
    if (!customer.deliveryZone) errors.deliveryZone = 'من فضلك اختر مكان التوصيل أولاً.';

    const validPaymentMethods = getValidPaymentMethods(customer.deliveryZone);
    if (!customer.paymentMethod || customer.paymentMethod === 'اختر طريقة الدفع' || !validPaymentMethods.includes(customer.paymentMethod)) {
      errors.paymentMethod = 'من فضلك اختر طريقة الدفع أولًا.';
    }

    if (!customer.address.trim()) errors.address = 'يرجى إدخال العنوان';
    
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      triggerVibration();
      if (errors.paymentMethod) {
        setToast({ visible: true, message: 'من فضلك اختر طريقة الدفع أولًا.' });
        setTimeout(() => setToast({ visible: false, message: '' }), 3000);
      }
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
      setCustomer(prev => {
        const restoredZone = lastOrder.deliveryZone || lastOrder.customer?.deliveryZone || prev.deliveryZone || '';
        const restoredPayment = lastOrder.paymentMethod || lastOrder.customer?.paymentMethod || prev.paymentMethod || '';
        const validPayment = (restoredZone === 'outside' && restoredPayment === 'نقدًا') ? '' : restoredPayment;
        return {
          ...prev,
          deliveryZone: restoredZone,
          paymentMethod: validPayment
        };
      });
      setIsEditing(true);
      setShowRestoreConfirm(false);
      setToast({ visible: true, message: 'تم استرجاع الطلب لتعديله' });
      setTimeout(() => setToast({ visible: false, message: '' }), 2500);
    }
  };

  const handleSendWhatsAppOrder = async () => {
    const validPaymentMethods = getValidPaymentMethods(customer.deliveryZone);

    if (!customer.paymentMethod || customer.paymentMethod === 'اختر طريقة الدفع' || !validPaymentMethods.includes(customer.paymentMethod)) {
      setFormErrors(prev => ({ ...prev, paymentMethod: 'من فضلك اختر طريقة الدفع أولًا.' }));
      triggerVibration();
      setToast({ visible: true, message: 'من فضلك اختر طريقة الدفع أولًا.' });
      setTimeout(() => setToast({ visible: false, message: '' }), 3000);
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
      
      let orderId = `SD-${dd}${mm}-${hh}${mins}`;

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

      message += `👤 الاسم: ${customer.name.trim()}\n📱 الهاتف: ${toEnglishDigits(customer.phone).trim()}\n📍 مكان التوصيل: ${customer.deliveryZone === 'damanhour' ? 'داخل دمنهور' : 'خارج دمنهور'}\n📍 العنوان: ${customer.address.trim()}\n`;
      if (customer.notes.trim()) message += `📝 ملاحظات: ${customer.notes.trim()}\n`;
      message += `\n📦 المنتجات المطلوبة:\n\n`;
      
      let totalWeightGrams = 0;
      cart.forEach((item, index) => {
        totalWeightGrams += (item.unitWeightGrams * item.qty);
        const itemTotal = (item.price * item.qty).toFixed(2);
        const itemOriginalTotal = item.originalPrice ? (item.originalPrice * item.qty).toFixed(2) : null;
        message += `*${index + 1}. ${item.name}*\n   🔷 الوزن: ${getCalculatedTotalWeight(item.weight, item.qty)}\n`;
        if (itemOriginalTotal && parseFloat(itemOriginalTotal) > parseFloat(itemTotal)) {
          message += `   🔷 السعر: ~${itemOriginalTotal}~ جنيه *${itemTotal} جنيه*\n\n`;
        } else {
          message += `   🔷 السعر: *${itemTotal} جنيه*\n\n`;
        }
      });

      message += `────────────\n\n⚖️ إجمالي الوزن: ${totalWeightGrams < 1000 ? `${totalWeightGrams} جرام` : `${(totalWeightGrams / 1000).toFixed(2)} كجم (${totalWeightGrams} جرام)`}\n`;
      message += `💰 إجمالي الفاتورة: ${totalAmount} جنيه\n`;
      message += `💳 طريقة الدفع: ${customer.paymentMethod}\n`;

      const isTransferNumberNeeded = customer.paymentMethod === 'InstaPay' || customer.paymentMethod === 'محفظة كاش';
      if (isTransferNumberNeeded) {
        message += `📲 رقم التحويل (${customer.paymentMethod}): *${TRANSFER_NUMBER}*\n`;
      }

      if (customer.deliveryZone === 'damanhour') {
        if (currentTotalNumber >= FREE_DELIVERY_THRESHOLD) {
          message += `🎁 *التوصيل مجاني (حساب المندوب علينا)*\n`;
        }
        message += `\n⏳ انتظرونا خلال 24 إلى 48 ساعة لوصول الأوردر، والتوصيل يومياً من الساعة 5 مساءً حتى 9 مساءً.`;
      } else if (customer.deliveryZone === 'outside') {
        message += `\n📦 *طريقة الشحن عبر البريد المصري:*\n`;
        message += `📌 *سريع:* تسليم باليد على العنوان.\n`;
        message += `📌 *عادي:* استلام من أقرب مكتب بريد.\n`;
        message += `💰 يتم إبلاغكم بمصاريف الشحن قبل الإرسال.\n\n`;
        message += `*يرجى إبلاغنا بطريقة الشحن المناسبة.*\n\n`;
        message += `💳 *لتأكيد الطلب:*\n`;
        message += `تحويل قيمة الفاتورة عبر ${customer.paymentMethod} على:\n*${TRANSFER_NUMBER}*`;
      }

      // إرسال الطلب للسيرفر مع مهلة 7 ثوانٍ لضمان استلام رابط تأكيد الإدارة من شيت جوجل
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            orderId,
            customer: {
              ...customer,
              phone: toEnglishDigits(customer.phone).replace(/\s+/g, '')
            },
            paymentMethod: customer.paymentMethod,
            cart,
            totalAmount
          })
        });
        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          const resData = await response.json();
          if (resData.adminLink) {
            message += `\n\n────────────\n⚙️ *إدارة المتجر (للاستخدام الداخلي)*\n🔗 لتأكيد الطلب وخصم المخزن اضغط هنا:\n${resData.adminLink}`;
          }
        }
      } catch (err) {
        console.warn('تأخر رد السيرفر، المتابعة إلى واتساب مباشرة:', err);
      }

      const nowTs = Date.now();
      const orderData = { 
        id: orderId, 
        items: cart, 
        deliveryZone: customer.deliveryZone, 
        paymentMethod: customer.paymentMethod, 
        customer: {
          name: customer.name,
          phone: toEnglishDigits(customer.phone),
          deliveryZone: customer.deliveryZone,
          paymentMethod: customer.paymentMethod,
          address: customer.address
        }, 
        createdAt: isEditing ? lastOrder.createdAt : nowTs, 
        expiresAt: isEditing ? lastOrder.expiresAt : nowTs + EDIT_WINDOW_MS 
      };
      
      localStorage.setItem('sedra_last_order', JSON.stringify(orderData));
      setLastOrder(orderData);
      
      setCart([]);
      setIsEditing(false);
      setCustomer(prev => {
        const nextData = { ...prev, notes: '', deliveryZone: '', paymentMethod: '' };
        localStorage.setItem('sedra_customer', JSON.stringify(nextData));
        return nextData;
      });
      setIsCartOpen(false);
      setCurrentStep('cart');
      
      // فتح تطبيق واتساب مباشرة
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`;
      window.location.assign(whatsappUrl);
      
    } catch (error) {
      setToast({ visible: true, message: "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى." });
      setTimeout(() => setToast({ visible: false, message: '' }), 4000);
    } finally {
      setIsSubmitting(false);
    }
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

      {!isSearchModeActive && (
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
      )}

      <main className="max-w-xl mx-auto px-4 mt-0">
        <div className={`sticky top-0 z-30 bg-[#fbf9f4]/98 backdrop-blur-md -mx-4 px-4 border-b border-[#e8e2d5] shadow-xs ${isSearchModeActive ? 'pt-2.5 pb-2.5 mb-2.5' : 'pt-1 pb-2.5 mb-3'}`}>
          
          {isEditing && !isSearchModeActive && (
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

          {!isSearchModeActive ? (
            <div className="space-y-2 mb-2.5">
              {/* السطر الأول: شريط البحث بعرض الشاشة كاملة مع التبديل التلقائي للنص */}
              <button
                type="button"
                onClick={openSearchMode}
                className="w-full bg-white rounded-2xl shadow-xs p-2.5 flex items-center justify-between gap-2 border-2 border-[#e8e2d5] hover:border-[#2d533e] active:scale-[0.99] transition text-right"
                aria-label="فتح البحث"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-[#2d533e]/10 flex items-center justify-center shrink-0">
                    <Search className="w-4 h-4 text-[#2d533e]" />
                  </div>
                  <span className="text-sm font-bold text-slate-500 truncate transition-all duration-300">
                    {SEARCH_PLACEHOLDERS[placeholderIndex]}
                  </span>
                </div>
                <span className="text-[11px] font-black text-[#2d533e] bg-[#fbf9f4] px-2.5 py-1 rounded-lg border border-[#e8e2d5] shrink-0">
                  بحث 🔍
                </span>
              </button>

              {/* السطر الثاني: زرا المتابعة وتعديل آخر طلب متجاورين بشكل متناسق */}
              <div className={`grid gap-2 ${lastOrder && !isEditing ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <a
                  href="/track"
                  className="bg-white border-2 border-[#e8e2d5] hover:border-[#2d533e] text-[#1e382b] text-xs font-black py-2.5 px-3 rounded-2xl transition shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Truck className="w-4 h-4 text-[#2d533e]" />
                  <span>تتبع طلبك 🚚</span>
                </a>

                {lastOrder && !isEditing && (
                  <button
                    type="button"
                    onClick={handleRestoreOrderRequest}
                    className="bg-[#2d533e] hover:bg-[#1e382b] text-white text-xs font-black py-2.5 px-3 rounded-2xl transition shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
                    title="استرجاع وتعديل طلبك السابق"
                  >
                    <RotateCcw className="w-4 h-4 text-[#c89d56]" />
                    <span>تعديل آخر طلب</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white rounded-2xl shadow-sm p-2 flex items-center gap-2 border-2 border-[#2d533e]">
                <Search className="w-5 h-5 text-[#2d533e] mr-1 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') closeSearchMode();
                  }}
                  placeholder={SEARCH_PLACEHOLDERS[placeholderIndex]}
                  className="w-full bg-transparent focus:outline-none text-sm sm:text-base font-bold text-[#1e382b] placeholder:text-slate-400 placeholder:font-semibold"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      if (searchInputRef.current) searchInputRef.current.focus();
                    }}
                    className="px-2 py-1 text-[11px] font-black text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg shrink-0 transition"
                  >
                    مسح
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={closeSearchMode}
                className="w-11 h-11 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 flex items-center justify-center shrink-0 shadow-2xs active:scale-95 transition"
                title="إغلاق البحث"
                aria-label="إغلاق البحث"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          )}

          {!loading && !error && !isSearchModeActive && displayCategories.length > 0 && (
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
                    className="px-2.5 py-1.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 active:scale-95 shadow-2xs group shrink-0"
                  >
                    <span className="text-sm leading-none">{visual.icon}</span>
                    <span className={`text-xs font-bold leading-tight whitespace-nowrap ${textClass}`}>{visual.label}</span>
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
          <>
            {isSearchModeActive && !search.trim() ? (
              <div className="bg-white border border-[#e8e2d5] rounded-2xl p-6 text-center my-3 shadow-2xs">
                <div className="w-12 h-12 rounded-full bg-[#2d533e]/10 flex items-center justify-center mx-auto mb-2.5">
                  <Search className="w-6 h-6 text-[#2d533e]" />
                </div>
                <p className="text-sm sm:text-base font-black text-[#1e382b] mb-1">اكتب اسم الصنف للبحث</p>
                <p className="text-xs font-semibold text-slate-500">مثال: كركم، ينسون، بهارات، بن، قرفة...</p>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-2.5">
                  {search.trim() ? (
                    <span className="text-xs font-black text-[#1e382b]">
                      نتائج البحث عن &laquo;{search.trim()}&raquo; ({filteredProducts.length} منتج)
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-500">{selectedCategory} ({filteredProducts.length} منتج)</span>
                  )}
                </div>

                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    {filteredProducts.map(product => {
                      const hasAnyOffer = product.variants.some(v => isOfferValid(v.price, v.originalPrice));
                      return (
                        <div key={product.id} className={`bg-white rounded-2xl p-3 border shadow-2xs flex flex-col justify-between transition relative ${product.isAvailable ? 'border-[#e8e2d5] hover:shadow-sm' : 'border-red-100 bg-[#fffcfc]'}`}>
                          {/* شارة فرصة خاصة في المساحة العلوية للكارت مكان التحديد */}
                          {hasAnyOffer && product.isAvailable && (
                            <span className="absolute -top-2.5 right-3 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm border border-white z-10 whitespace-nowrap">
                              🔥 فرصة خاصة
                            </span>
                          )}

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
                                  <button onClick={(e) => handleShareProduct(product, e)} className="p-1 text-slate-400 hover:text-[#2d533e] transition rounded-md shrink-0" title="مشاركة المنتج"><Share2 className="w-3.5 h-3.5" /></button>
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
                                    <span className={`text-[11px] sm:text-xs font-bold whitespace-nowrap ${!v.available ? 'line-through text-slate-300' : 'text-slate-600'}`}>{v.weight}</span>
                                    <div className={`font-bold flex flex-col items-end justify-center shrink-0 ${v.available ? 'text-[#2d533e]' : 'text-slate-400'}`}>
                                      {v.available ? (
                                        <>
                                          {hasOffer && <span className="text-slate-500 line-through decoration-slate-400/80 text-[10px] font-semibold leading-none mb-0.5 whitespace-nowrap">{v.originalPrice} جنيه</span>}
                                          <span className="text-xs sm:text-sm leading-none whitespace-nowrap">{v.price} جنيه</span>
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
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white border border-[#e8e2d5] rounded-2xl p-6 text-center my-4 shadow-2xs">
                    <p className="text-sm sm:text-base font-black text-[#1e382b] mb-1">لم نجد صنفًا مطابقًا لبحثك.</p>
                    <p className="text-xs font-semibold text-slate-500">جرّب كلمة أخرى أو اكتب جزءًا من اسم الصنف.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* --- Modal تفاصيل الصنف --- */}
      {activeModalProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md h-[90vh] sm:h-auto sm:max-h-[95vh] rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 relative">
            
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

            <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-white pb-[140px] sm:pb-32">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-800 block border-b border-slate-50 pb-1.5">الأوزان المتاحة</label>
                
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

                <div 
                  onClick={() => { 
                    triggerVibration(); 
                    setIsCustomWeight(true); 
                    setTimeout(() => {
                      if (customWeightInputRef.current) customWeightInputRef.current.focus();
                    }, 50);
                  }} 
                  className={`p-3.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${isCustomWeight ? 'border-[#2d533e] bg-white shadow-md' : 'border-[#e8e2d5] bg-[#fdfcfa] hover:border-[#c89d56]'}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isCustomWeight ? 'border-[#2d533e] bg-[#2d533e]' : 'border-slate-300 bg-white'}`}>
                      {isCustomWeight && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className={`text-sm font-black ${isCustomWeight ? 'text-[#1e382b]' : 'text-slate-600'}`}>وزن مخصص بالجرام</span>
                  </div>
                  
                  {isCustomWeight && (
                    <div className="mt-3.5 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <input 
                          ref={customWeightInputRef}
                          type="text" 
                          inputMode="decimal"
                          value={customWeightValue} 
                          onChange={(e) => {
                            const val = toEnglishDigits(e.target.value).replace(/[^0-9.]/g, '');
                            setCustomWeightValue(val);
                          }} 
                          placeholder="مثال: 250" 
                          className="flex-1 p-2.5 text-center text-base font-black border-2 border-slate-200 rounded-lg outline-none focus:border-[#2d533e] focus:bg-[#fbf9f4] bg-white shadow-sm text-[#1e382b] transition-colors" 
                        />
                        <span className="text-sm font-black text-slate-600 shrink-0 bg-slate-100 px-3 py-2.5 rounded-lg border border-slate-200">جرام</span>
                      </div>

                      <div className="mt-3 bg-[#fbf9f4] rounded-lg border border-[#e8e2d5] p-3 shadow-inner">
                        {customWeightValue && parseFloat(customWeightValue) > 0 ? (
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-[11px] font-bold text-slate-500 block mb-0.5">الوزن المطلوب</span>
                              <span className="text-sm font-black text-[#1e382b]">{getCalculatedTotalWeight(`${customWeightValue} جرام`, modalQty)}</span>
                            </div>
                            <div className="text-left">
                              <span className="text-[11px] font-bold text-slate-500 block mb-0.5">السعر النهائي</span>
                              <div className="flex items-center gap-1.5 justify-end">
                                {getCalculatedOriginalPrice() && (
                                  <span className="text-slate-400 line-through text-[10px] font-bold">
                                    {(getCalculatedOriginalPrice() * modalQty).toFixed(2)}
                                  </span>
                                )}
                                <span className="text-base font-black text-[#2d533e]">
                                  {(getCalculatedPrice() * modalQty).toFixed(2)} جنيه
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-2 text-slate-500 text-xs font-bold flex items-center justify-center gap-1.5">
                            <AlertCircle className="w-4 h-4" /> أدخل الوزن بالجرام لظهور السعر
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {activeModalProduct.parsedGrindOptions && activeModalProduct.parsedGrindOptions.length > 0 && (
                <div ref={grindSectionRef} className={`space-y-2 ${grindError ? 'p-3 -mx-3 bg-red-50/80 border border-red-200 rounded-2xl transition-all duration-300' : 'transition-all duration-300'}`}>
                  <span className={`text-xs font-black block mb-1.5 border-b pb-1 ${grindError ? 'text-red-700 border-red-200' : 'text-slate-800 border-slate-50'}`}>
                    حالة المنتج {grindError && <span className="text-red-600 text-[10px] mr-1">(مطلوب تحديد الحالة)</span>}
                  </span>
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
                            onClick={() => { triggerVibration(); setGrindOption(opt); setGrindError(false); }}
                            className={`relative flex-1 py-2.5 px-2 rounded-xl border-2 transition-all duration-200 outline-none focus-visible:ring-4 focus-visible:ring-[#2d533e]/20 ${
                              isSelected 
                                ? 'bg-[#2d533e] border-[#2d533e] text-white shadow-md z-10' 
                                : grindError 
                                  ? 'bg-white border-red-300 text-red-700 hover:bg-red-50' 
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

              <div className="space-y-2">
                <span className="text-xs font-black text-slate-800 block mb-1.5 border-b border-slate-50 pb-1">الكمية المطلوبة</span>
                <div className="flex items-center gap-3 justify-center bg-slate-50 py-1.5 rounded-xl border border-slate-100">
                  <button onClick={() => { 
                    triggerVibration(); 
                    setModalQty(Math.max(1, modalQty - 1)); 
                  }} className="w-8 h-8 rounded-lg bg-white border-2 border-[#e8e2d5] flex items-center justify-center font-bold text-[#1e382b] shadow-sm hover:bg-slate-100"><Minus className="w-4 h-4" /></button>
                  <span className="font-black text-base text-[#1e382b] w-6 text-center">{modalQty}</span>
                  <button onClick={() => { 
                    triggerVibration(); 
                    const weightGrams = isCustomWeight ? (parseFloat(customWeightValue) || 0) : getWeightNumberInGrams(selectedVariant?.weight);
                    const requestedGrams = weightGrams * (modalQty + 1);
                    const alreadyInCartGrams = getReservedStockGrams(cart, activeModalProduct.id);
                    
                    if ((requestedGrams + alreadyInCartGrams) > activeModalProduct.stockGrams) {
                      setToast({ visible: true, message: `الكمية المطلوبة أكبر من المتاح حالياً. المتاح: ${activeModalProduct.stockGrams} جرام.` });
                      setTimeout(() => setToast({ visible: false, message: '' }), 3000);
                    } else {
                      setModalQty(modalQty + 1); 
                    }
                  }} className="w-8 h-8 rounded-lg bg-white border-2 border-[#e8e2d5] flex items-center justify-center font-bold text-[#1e382b] shadow-sm hover:bg-slate-100"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-200 bg-white shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-20">
              <button 
                disabled={(!selectedVariant || !selectedVariant.available) || (isCustomWeight && (!customWeightValue || parseFloat(customWeightValue) <= 0))} 
                onClick={(e) => {
                  if (activeModalProduct.parsedGrindOptions?.length > 1 && !grindOption) {
                    setGrindError(true);
                    triggerVibration();
                    setToast({ visible: true, message: 'الرجاء تحديد حالة المنتج (حصى أو مطحون)' });
                    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
                    if (grindSectionRef.current) {
                      grindSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    return;
                  }
                  addToCart(e);
                }} 
                className="w-full bg-[#2d533e] disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 text-white py-3.5 rounded-xl font-black text-sm sm:text-base shadow-lg hover:bg-[#1e382b] transition transform active:scale-[0.98]"
              >
                {(() => {
                  if (isCustomWeight && (!customWeightValue || parseFloat(customWeightValue) <= 0)) return 'أدخل الوزن المطلوب أولاً';
                  if (!selectedVariant?.available) return 'هذا الصنف غير متوفر حالياً';
                  return `إضافة للسلة — ${(getCalculatedPrice() * modalQty).toFixed(2)} جنيه`;
                })()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- تكبير الصورة --- */}
      {zoomedImage && (
        <div style={{ zIndex: 99999 }} className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-sm sm:max-w-md w-full bg-white rounded-3xl p-3 shadow-2xl flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setZoomedImage(null)} className="absolute top-4 left-4 z-20 p-2 bg-black/60 text-white rounded-full"><X className="w-5 h-5" /></button>
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center"><img src={zoomedImage} alt="صورة المنتج" referrerPolicy="no-referrer" className="w-full h-full object-contain" /></div>
            <p className="text-sm font-bold text-slate-300 mt-3">انقر في أي مكان للإغلاق</p>
          </div>
        </div>
      )}

      {/* الشريط السفلي العائم للسلة */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-[#e8e2d5] z-30 shadow-md pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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

      {/* --- Modal السلة ومراحل الطلب --- */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md h-[96vh] sm:h-auto sm:max-h-[95vh] rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 relative">
            <div className={`px-4 border-b border-slate-100 shrink-0 bg-white z-10 ${currentStep === 'checkout' ? 'py-2.5' : 'py-3.5'}`}>
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

            <div className={`flex-1 overflow-y-auto px-4 bg-white pb-[140px] sm:pb-36 ${currentStep === 'checkout' ? 'pt-2.5' : 'pt-4'}`}>
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
                              {item.originalPrice && isOfferValid(item.price, item.originalPrice) && (
                                <span className="text-slate-400 line-through font-bold">{(item.originalPrice * item.qty).toFixed(2)} جنيه</span>
                              )}
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
                <form id="checkout-form" onSubmit={handleProceedToReview} className="space-y-2.5">
                  <div>
                    <label className="text-[11px] sm:text-xs font-bold text-slate-700 block mb-1">الاسم الكامل <span className="text-red-500">*</span></label>
                    <input type="text" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="أدخل اسمك بالكامل" className={`w-full py-2.5 px-3 text-sm font-bold rounded-xl border-2 ${formErrors.name ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:border-[#2d533e]'} outline-none`} />
                  </div>
                  
                  <div>
                    <label className="text-[11px] sm:text-xs font-bold text-slate-700 block mb-1">رقم الهاتف <span className="text-red-500">*</span></label>
                    <input type="tel" dir="ltr" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="01012345678" className={`w-full py-2.5 px-3 text-sm font-bold rounded-xl border-2 text-right ${formErrors.phone ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:border-[#2d533e]'} outline-none`} />
                    {formErrors.phone && <p className="text-red-600 text-[10px] font-bold mt-1">{formErrors.phone}</p>}
                  </div>

                  <div className={`${formErrors.deliveryZone ? 'p-3 -mx-3 bg-red-50/80 border border-red-200 rounded-2xl transition-all duration-300' : 'transition-all duration-300'}`}>
                    <label className={`text-[11px] sm:text-xs font-bold block mb-1.5 ${formErrors.deliveryZone ? 'text-red-700 border-b border-red-200 pb-1' : 'text-slate-700'}`}>
                      مكان التوصيل <span className="text-red-500">*</span> {formErrors.deliveryZone && <span className="text-red-600 text-[10px] mr-1">(مطلوب تحديد المكان)</span>}
                    </label>
                    <div className="flex gap-2 w-full" role="radiogroup" aria-label="مكان التوصيل">
                      <button type="button" role="radio" aria-checked={customer.deliveryZone === 'damanhour'} onClick={() => { triggerVibration(); setCustomer(prev => ({ ...prev, deliveryZone: 'damanhour' })); setFormErrors(prev => ({ ...prev, deliveryZone: null })); }} className={`flex-1 py-2.5 px-2 rounded-xl border-2 transition-all font-black text-sm flex items-center justify-center gap-1.5 outline-none ${customer.deliveryZone === 'damanhour' ? 'bg-[#2d533e] border-[#2d533e] text-white shadow-sm' : formErrors.deliveryZone ? 'bg-white border-red-300 text-red-700 hover:bg-red-50' : 'bg-white border-[#e8e2d5] text-slate-500 hover:border-[#c89d56] hover:bg-[#fffdf8] hover:text-[#1e382b]'}`}>
                        {customer.deliveryZone === 'damanhour' && <Check className="w-4 h-4" />} داخل دمنهور
                      </button>
                      <button type="button" role="radio" aria-checked={customer.deliveryZone === 'outside'} onClick={() => { triggerVibration(); setCustomer(prev => ({ ...prev, deliveryZone: 'outside', paymentMethod: prev.paymentMethod === 'نقدًا' ? '' : prev.paymentMethod })); setFormErrors(prev => ({ ...prev, deliveryZone: null })); }} className={`flex-1 py-2.5 px-2 rounded-xl border-2 transition-all font-black text-sm flex items-center justify-center gap-1.5 outline-none ${customer.deliveryZone === 'outside' ? 'bg-[#2d533e] border-[#2d533e] text-white shadow-sm' : formErrors.deliveryZone ? 'bg-white border-red-300 text-red-700 hover:bg-red-50' : 'bg-white border-[#e8e2d5] text-slate-500 hover:border-[#c89d56] hover:bg-[#fffdf8] hover:text-[#1e382b]'}`}>
                        {customer.deliveryZone === 'outside' && <Check className="w-4 h-4" />} خارج دمنهور
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] sm:text-xs font-bold text-slate-700 block mb-1">طريقة الدفع <span className="text-red-500">*</span></label>
                    <select
                      value={customer.paymentMethod || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomer(prev => ({ ...prev, paymentMethod: val }));
                        if (val) setFormErrors(prev => ({ ...prev, paymentMethod: null }));
                      }}
                      className={`w-full py-2.5 px-3 text-sm font-bold rounded-xl border-2 bg-white ${formErrors.paymentMethod ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200 focus:border-[#2d533e] text-[#1e382b]'} outline-none`}
                    >
                      <option value="">اختر طريقة الدفع</option>
                      <option value="InstaPay">InstaPay</option>
                      <option value="محفظة كاش">محفظة كاش</option>
                      {customer.deliveryZone !== 'outside' && (
                        <option value="نقدًا">نقدًا</option>
                      )}
                      <option value="تحويل بنكي">تحويل بنكي</option>
                    </select>
                    {formErrors.paymentMethod && (
                      <p className="text-red-600 text-[10px] sm:text-[11px] font-bold mt-1">{formErrors.paymentMethod}</p>
                    )}
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
                      <div><strong className="font-black text-slate-800">طريقة الدفع:</strong> {customer.paymentMethod}</div>
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

            <div className="absolute bottom-0 left-0 right-0 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-200 bg-white shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-20">
              <div className="flex justify-between items-center font-black text-sm pb-2.5">
                <span className="text-slate-700">الإجمالي النهائي:</span>
                <span className="text-[#2d533e] text-base sm:text-lg">{totalAmount} جنيه</span>
              </div>

              <div className="flex flex-col gap-2">
                {currentStep === 'cart' && (
                  <button disabled={cart.length === 0} onClick={() => setCurrentStep('checkout')} className="w-full bg-[#2d533e] disabled:opacity-50 text-white py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#1e382b] transition-transform active:scale-[0.98]"><span>متابعة إتمام الطلب</span><ChevronRight className="w-3.5 h-3.5 rotate-180" /></button>
                )}

                {currentStep === 'checkout' && (
                  <button form="checkout-form" type="submit" className="w-full bg-[#2d533e] text-white py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#1e382b] transition-transform active:scale-[0.98]"><span>مراجعة الطلب قبل الإرسال</span><ChevronRight className="w-3.5 h-3.5 rotate-180" /></button>
                )}

                {currentStep === 'review' && (
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentStep('checkout')} className="flex-1 bg-slate-100 text-[#1e382b] border-2 border-slate-200 hover:bg-slate-200 py-3 rounded-xl font-black text-xs sm:text-sm transition-colors">تعديل البيانات</button>
                    <button disabled={isSubmitting} onClick={handleSendWhatsAppOrder} className="flex-[2] bg-[#25D366] hover:bg-[#20b858] disabled:opacity-50 text-white py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-[0.98]">
                      {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Phone className="w-3.5 h-3.5 fill-white" /><span>إرسال عبر واتساب</span></>}
                    </button>
                  </div>
                )}

                <button onClick={() => setIsCartOpen(false)} className="w-full bg-white text-red-600 border-2 border-red-500 py-2.5 rounded-xl font-black text-xs sm:text-sm hover:bg-red-50 transition-colors">رجوع لمتابعة التسوق</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* مودال تأكيد مسح السلة */}
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

      {/* مودال استعادة الطلب */}
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
