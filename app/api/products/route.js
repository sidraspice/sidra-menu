import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

function parseWeightsFromCell(cellValue) {
  if (!cellValue) return [50, 125];
  const normalized = cellValue.toString().replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  const cleaned = normalized.replace(/[,،/\-|;+]/g, ' ');
  const matches = cleaned.match(/\d+(\.\d+)?/g);
  if (!matches || matches.length === 0) return [50, 125];
  return matches.map(m => parseFloat(m));
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return { products: [], storeSettings: { openHour: 9, closeHour: 23, mode: 'تلقائي' } };

  const headers = parseCSVLine(lines[0]);

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
  const productsMap = {};

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
    const rawGrind = grindIdx !== -1 && values[grindIdx] ? values[grindIdx].trim() : '';

    const rawImageUrl = imageIdx !== -1 && values[imageIdx] ? values[imageIdx].trim() : '';
    const formattedImageUrl = formatImageUrl(rawImageUrl);

    const parsedRegularKilo = parseFloat(values[regularPriceIdx]);
    if (isNaN(parsedRegularKilo)) continue;

    let finalKiloPrice = parsedRegularKilo;
    let crossedOutKiloPrice = null;

    if (newDiscountPriceIdx !== -1 && values[newDiscountPriceIdx]) {
      const parsedNew = parseFloat(values[newDiscountPriceIdx]);
      if (!isNaN(parsedNew) && parsedNew > 0 && parsedNew < parsedRegularKilo) {
        finalKiloPrice = parsedNew;
        crossedOutKiloPrice = parsedRegularKilo;
      }
    }

    const hasStock = stockVal > 0;
    const isAvailable = statusVal !== 'غير متوفر' && hasStock;
    const targetWeights = parseWeightsFromCell(rawWeight);

    const variants = targetWeights.map(grams => {
      const price = parseFloat(((finalKiloPrice * grams) / 1000).toFixed(2));
      const originalPrice = crossedOutKiloPrice 
        ? parseFloat(((crossedOutKiloPrice * grams) / 1000).toFixed(2)) 
        : null;

      return {
        weight: `${grams} جرام`,
        price: price,
        originalPrice: originalPrice,
        available: isAvailable
      };
    });

    const key = itemCodeVal ? itemCodeVal : `${rowCat}_${rowName}`;

    if (!productsMap[key]) {
      productsMap[key] = {
        id: key,
        itemCode: itemCodeVal,
        name: rowName,
        category: rowCat || 'أخرى',
        image: formattedImageUrl,
        grindOptions: rawGrind,
        stockGrams: stockVal,
        alertLimit: alertVal,
        status: statusVal,
        kiloPrice: finalKiloPrice,
        originalKiloPrice: crossedOutKiloPrice,
        variants: variants,
        'كود الصنف': itemCodeVal,
        'حالة الصنف': statusVal,
        'المخزون الحالي بالجرام': stockVal,
        isAvailable: isAvailable
      };
    } else {
      if (stockVal > productsMap[key].stockGrams) {
        productsMap[key].stockGrams = stockVal;
        productsMap[key]['المخزون الحالي بالجرام'] = stockVal;
      }
      if (!productsMap[key].image && formattedImageUrl) {
        productsMap[key].image = formattedImageUrl;
      }
    }
  }

  const products = Object.values(productsMap);
  return { products, storeSettings };
}

let lastSuccessfulCache = null;

export async function GET() {
  try {
    const rawSheetUrl = process.env.GOOGLE_SHEET_CSV_URL || "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0KMamBEhCgLLWA4TEsYLz9uvxBE-EShQ0kBON0tYut-dZrBm4BDfuDgf23rD4KlWTt_PgCf--4vQz/pub?output=csv";
    const separator = rawSheetUrl.includes('?') ? '&' : '?';
    const sheetUrl = `${rawSheetUrl}${separator}_t=${Date.now()}`;

    const res = await fetch(sheetUrl, {
      cache: 'no-store'
    });

    if (!res.ok) throw new Error('فشل جلب البيانات من Google Sheets');

    const csvData = await res.text();
    const { products, storeSettings } = parseCSV(csvData);
    const rawCategories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
    const categories = ['كل المنتجات', ...rawCategories];

    const result = { success: true, categories, products, storeSettings, updatedAt: new Date().toISOString() };
    lastSuccessfulCache = result;

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
  } catch (error) {
    if (lastSuccessfulCache) {
      return NextResponse.json(lastSuccessfulCache, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        }
      });
    }
    return NextResponse.json({ success: false, error: 'تعذر تحميل قائمة المنتجات حاليًا.' }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  }
}
