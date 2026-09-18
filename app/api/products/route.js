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

  const categoryIdx = headers.findIndex(h => h.includes('قسم') || h.includes('تصنيف'));
  const nameIdx = headers.findIndex(h => h.includes('منتج') || h.includes('اسم') || h.includes('صنف'));
  const weightIdx = headers.findIndex(h => h.includes('وزن') || h.includes('حجم'));
  const grindIdx = headers.findIndex(h => h.includes('طحن') || h.includes('grind'));
  
  const newDiscountPriceIdx = headers.findIndex(h => h.includes('جديد') || h.includes('خصم') || h.includes('بعد') || h.includes('عرض'));
  const regularPriceIdx = headers.findIndex(h => 
    (h.includes('سعر') || h.includes('ثمن')) && 
    !(h.includes('جديد') || h.includes('خصم') || h.includes('بعد') || h.includes('عرض'))
  );

  const imageIdx = headers.findIndex(h => 
    h.includes('صورة') || h.includes('صوره') || h.includes('image') || h.includes('img') || h.includes('رابط') || h.includes('الصور')
  );

  const codeIdx = headers.findIndex(h => h.includes('كود') || h.includes('code'));
  const stockIdx = headers.findIndex(h => h.includes('مخزون') || h.includes('stock'));
  const alertIdx = headers.findIndex(h => h.includes('تنبيه') || h.includes('alert'));

  let statusIdx = headers.findIndex(h => {
    const clean = h.trim();
    return clean === 'الحالة' || clean === 'حالة' || clean === 'حالة الصنف' || clean.includes('توفر') || clean.includes('متوفر') || clean.includes('متاح');
  });

  if (statusIdx === -1) {
    for (let r = 1; r < Math.min(lines.length, 10); r++) {
      const vals = parseCSVLine(lines[r]);
      const col = vals.findIndex(v => v.includes('متوفر') || v.includes('متاح') || v.includes('غير'));
      if (col !== -1) {
        statusIdx = col;
        break;
      }
    }
  }

  let storeSettings = { openHour: 9, closeHour: 23, mode: 'تلقائي' };
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (!values[nameIdx]) continue;

    const rowName = values[nameIdx].trim();
    const rowCat = categoryIdx !== -1 && values[categoryIdx] ? values[categoryIdx].trim() : '';

    if (rowName.includes('حالة المتجر') || rowName.includes('مواعيد العمل') || rowCat.includes('إعدادات')) {
      // إعدادات المتجر
      continue; 
    }

    if (!values[regularPriceIdx]) continue;

    const rawWeight = values[weightIdx] ? values[weightIdx].trim() : '';
    if (rawWeight === '1000' || rawWeight === '1000g' || rawWeight === '1 كجم' || rawWeight === '1كجم' || rawWeight === '1 كيلو' || rawWeight === 'كيلو') continue;

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
      // هنا الذكاء: لو لقى وزن تاني فاضي، بيحتفظ بالرقم الأكبر اللي إنت كتبته في الوزن الأول
      if (item.stockGrams > productsMap[key].stockGrams) {
        productsMap[key].stockGrams = item.stockGrams;
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
       // يشتغل لو المخزون المشترك أكبر من صفر، ومفيش كلمة "غير متوفر" صريحة
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
