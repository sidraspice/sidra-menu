import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function formatImageUrl(url) {
  if (!url) return '';
  const trimmed = url.trim().replace(/^["']|["']$/g, '');
  if (!trimmed) return '';

  if (trimmed.includes('drive.google.com') || trimmed.includes('googleusercontent.com')) {
    const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
                  trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                  trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return trimmed;
  }
  if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) {
    return `https://lh3.googleusercontent.com/d/${trimmed}`;
  }
  return trimmed;
}

function parseCSVLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim().replace(/^["']|["']$/g, ''));
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim().replace(/^["']|["']$/g, ''));
  return result;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return { products: [], storeSettings: { openHour: 9, closeHour: 23, mode: 'تلقائي' } };

  const headers = parseCSVLine(lines[0]);

  // البحث المرن والشامل عن عمود القسم بكل أشكاله المحتملة
  const categoryIdx = headers.findIndex(h => {
    const clean = h.trim().toLowerCase();
    return clean.includes('قسم') || clean.includes('تصنيف') || clean.includes('category') || clean.includes('cat');
  });

  const nameIdx = headers.findIndex(h => {
    const clean = h.trim().toLowerCase();
    return clean.includes('منتج') || clean.includes('اسم') || clean.includes('صنف') || clean.includes('name');
  });

  const weightIdx = headers.findIndex(h => {
    const clean = h.trim().toLowerCase();
    return clean.includes('وزن') || clean.includes('حجم') || clean.includes('weight');
  });

  const grindIdx = headers.findIndex(h => {
    const clean = h.trim().toLowerCase();
    return clean.includes('طحن') || clean.includes('grind');
  });
  
  const newDiscountPriceIdx = headers.findIndex(h => {
    const clean = h.trim().toLowerCase();
    return clean.includes('جديد') || clean.includes('خصم') || clean.includes('بعد') || clean.includes('عرض');
  });

  const regularPriceIdx = headers.findIndex(h => {
    const clean = h.trim().toLowerCase();
    return (clean.includes('سعر') || clean.includes('ثمن') || clean.includes('price')) && 
           !(clean.includes('جديد') || clean.includes('خصم') || clean.includes('بعد') || clean.includes('عرض'));
  });

  const imageIdx = headers.findIndex(h => {
    const clean = h.trim().toLowerCase();
    return clean.includes('صورة') || clean.includes('صوره') || clean.includes('image') || clean.includes('img') || clean.includes('رابط') || clean.includes('الصور');
  });

  const codeIdx = headers.findIndex(h => {
    const clean = h.trim().toLowerCase();
    return clean.includes('كود') || clean.includes('code');
  });

  const stockIdx = headers.findIndex(h => {
    const clean = h.trim().toLowerCase();
    return clean.includes('مخزون') || clean.includes('stock');
  });

  const alertIdx = headers.findIndex(h => {
    const clean = h.trim().toLowerCase();
    return clean.includes('تنبيه') || clean.includes('alert');
  });

  let statusIdx = headers.findIndex(h => {
    const clean = h.trim().toLowerCase();
    return clean === 'الحالة' || clean === 'حالة' || clean === 'حالة الصنف' || clean.includes('توفر') || clean.includes('متوفر') || clean.includes('متاح');
  });

  let storeSettings = { openHour: 9, closeHour: 23, mode: 'تلقائي' };
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (nameIdx === -1 || !values[nameIdx]) continue;

    const rowName = values[nameIdx].trim();
    const rowCat = categoryIdx !== -1 && values[categoryIdx] ? values[categoryIdx].trim() : '';

    if (rowName.includes('حالة المتجر') || rowName.includes('مواعيد العمل') || rowCat.includes('إعدادات')) {
      continue; 
    }

    if (regularPriceIdx === -1 || !values[regularPriceIdx]) continue;

    const rawWeight = weightIdx !== -1 && values[weightIdx] ? values[weightIdx].trim() : '';
    const itemCodeVal = codeIdx !== -1 && values[codeIdx] ? values[codeIdx].trim() : '';
    const stockVal = stockIdx !== -1 && values[stockIdx] ? parseFloat(values[stockIdx].replace(/,/g, '')) || 0 : 0;
    const alertVal = alertIdx !== -1 && values[alertIdx] ? parseFloat(values[alertIdx].replace(/,/g, '')) || 0 : 0;
    const statusVal = statusIdx !== -1 && values[statusIdx] ? values[statusIdx].trim() : '';

    const rawImageUrl = imageIdx !== -1 && values[imageIdx] ? values[imageIdx].trim() : '';
    const formattedImageUrl = formatImageUrl(rawImageUrl);

    const parsedRegular = parseFloat(values[regularPriceIdx]);
    if (isNaN(parsedRegular)) continue;

    let finalPriceToPay = parsedRegular;
    let crossedOutPrice = null;

    if (newDiscountPriceIdx !== -1 && values[newDiscountPriceIdx]) {
      const parsedNew = parseFloat(values[newDiscountPriceIdx]);
      if (!isNaN(parsedNew) && parsedNew > 0 && parsedNew < parsedRegular) {
        finalPriceToPay = parsedNew;
        crossedOutPrice = parsedRegular;
      }
    }

    let finalWeightStr = 'حسب الطلب';
    if (rawWeight) {
      finalWeightStr = (rawWeight.includes('جرام') || rawWeight.includes('g') || rawWeight.includes('ك')) ? rawWeight : `${rawWeight} جرام`;
    }

    rows.push({
      category: rowCat || 'أخرى',
      name: rowName,
      weight: finalWeightStr,
      grindOptions: grindIdx !== -1 && values[grindIdx] ? values[grindIdx].trim() : '',
      price: finalPriceToPay, 
      originalPrice: crossedOutPrice, 
      explicitStatus: statusVal, 
      image: formattedImageUrl,
      itemCode: itemCodeVal,
      stockGrams: stockVal,
      alertLimit: alertVal
    });
  }

  const productsMap = {};
  rows.forEach(item => {
    const key = item.itemCode ? item.itemCode : `${item.category}_${item.name}`;
    
    if (!productsMap[key]) {
      productsMap[key] = {
        id: key,
        itemCode: item.itemCode,
        name: item.name,
        category: item.category,
        image: item.image || '',
        grindOptions: item.grindOptions || '', 
        stockGrams: item.stockGrams,
        alertLimit: item.alertLimit,
        variants: []
      };
    } else {
      if (item.stockGrams > productsMap[key].stockGrams) {
        productsMap[key].stockGrams = item.stockGrams;
      }
      if (item.category && (!productsMap[key].category || productsMap[key].category === 'أخرى')) {
        productsMap[key].category = item.category;
      }
    }

    if (item.image && !productsMap[key].image) productsMap[key].image = item.image;
    if (item.grindOptions && !productsMap[key].grindOptions) productsMap[key].grindOptions = item.grindOptions;

    productsMap[key].variants.push({
      weight: item.weight,
      price: item.price,
      originalPrice: item.originalPrice,
      explicitStatus: item.explicitStatus
    });
  });

  const products = Object.values(productsMap).map(product => {
    const hasStock = product.stockGrams > 0;
    
    const mappedVariants = product.variants.map(v => ({
       weight: v.weight,
       price: v.price,
       originalPrice: v.originalPrice,
       available: v.explicitStatus !== 'غير متوفر' && hasStock
    }));

    return {
      ...product,
      variants: mappedVariants,
      'كود الصنف': product.itemCode,
      'المخزون الحالي بالجرام': product.stockGrams, 
      isAvailable: hasStock && mappedVariants.some(v => v.available)
    };
  });

  return { products, storeSettings };
}

export async function GET() {
  try {
    const sheetUrl = process.env.GOOGLE_SHEET_CSV_URL || "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0KMamBEhCgLLWA4TEsYLz9uvxBE-EShQ0kBON0tYut-dZrBm4BDfuDgf23rD4KlWTt_PgCf--4vQz/pub?output=csv";
    const urlWithCacheBust = sheetUrl + (sheetUrl.includes('?') ? '&' : '?') + 'nocache=' + Date.now();

    const res = await fetch(urlWithCacheBust, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
    });

    if (!res.ok) throw new Error('فشل جلب البيانات من Google Sheets');

    const csvData = await res.text();
    const { products, storeSettings } = parseCSV(csvData);
    const rawCategories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
    const categories = ['كل المنتجات', ...rawCategories];

    return NextResponse.json({ success: true, categories, products, storeSettings, updatedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'تعذر تحميل قائمة المنتجات حاليًا.' }, { status: 500 });
  }
}
