import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function formatDriveUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  
  // استخراج ID الصورة من أي رابط Google Drive وتحويله لرابط سريع ومباشر 100%
  if (trimmed.includes('drive.google.com')) {
    const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
    }
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
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  
  const categoryIdx = headers.findIndex(h => h.includes('قسم') || h.includes('تصنيف'));
  const nameIdx = headers.findIndex(h => h.includes('منتج') || h.includes('اسم') || h.includes('صنف'));
  const weightIdx = headers.findIndex(h => h.includes('وزن') || h.includes('حجم'));
  const priceIdx = headers.findIndex(h => h.includes('سعر') || h.includes('ثمن'));
  const imageIdx = headers.findIndex(h => h.includes('صورة') || h.includes('image') || h.includes('img') || h.includes('رابط'));
  
  let statusIdx = headers.findIndex(h => 
    h.includes('حالة') || 
    h.includes('توفر') || 
    h.includes('متوفر') || 
    h.includes('متاح') || 
    h.includes('status') || 
    h.includes('المتاح') ||
    h.includes('التوفر')
  );

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

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (!values[nameIdx] || !values[priceIdx]) continue;

    const rawWeight = values[weightIdx] ? values[weightIdx].trim() : '';
    if (rawWeight === '1000' || rawWeight === '1000g' || rawWeight === '1 كجم' || rawWeight === '1كجم' || rawWeight === '1 كيلو' || rawWeight === 'كيلو') {
      continue;
    }

    let isAvailable = true;
    if (statusIdx !== -1 && values[statusIdx] !== undefined) {
      const statusVal = values[statusIdx].trim();
      if (
        statusVal.includes('غير') || 
        statusVal.includes('لا') || 
        statusVal.includes('نفذ') || 
        statusVal.includes('خلص') || 
        statusVal.toLowerCase() === 'out' || 
        statusVal.toLowerCase() === 'false' || 
        statusVal === '0'
      ) {
        isAvailable = false;
      }
    }

    const rawImageUrl = imageIdx !== -1 && values[imageIdx] ? values[imageIdx].trim() : '';
    const formattedImageUrl = formatDriveUrl(rawImageUrl);

    rows.push({
      category: values[categoryIdx] || 'أخرى',
      name: values[nameIdx],
      weight: rawWeight ? `${rawWeight} جرام` : 'حسب الطلب',
      price: parseFloat(values[priceIdx]) || 0,
      available: isAvailable,
      image: formattedImageUrl
    });
  }

  const productsMap = {};
  rows.forEach(item => {
    const key = `${item.category}_${item.name}`;
    if (!productsMap[key]) {
      productsMap[key] = {
        id: key,
        name: item.name,
        category: item.category,
        image: item.image || '',
        variants: []
      };
    }
    if (item.image && !productsMap[key].image) {
      productsMap[key].image = item.image;
    }
    productsMap[key].variants.push({
      weight: item.weight,
      price: item.price,
      available: item.available
    });
  });

  return Object.values(productsMap).map(product => ({
    ...product,
    isAvailable: product.variants.some(v => v.available)
  }));
}

export async function GET() {
  try {
    const sheetUrl = process.env.GOOGLE_SHEET_CSV_URL || "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0KMamBEhCgLLWA4TEsYLz9uvxBE-EShQ0kBON0tYut-dZrBm4BDfuDgf23rD4KlWTt_PgCf--4vQz/pub?output=csv";
    const urlWithCacheBust = sheetUrl + (sheetUrl.includes('?') ? '&' : '?') + 'nocache=' + Date.now();
    
    const res = await fetch(urlWithCacheBust, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    if (!res.ok) {
      throw new Error('فشل جلب البيانات من Google Sheets');
    }

    const csvData = await res.text();
    const products = parseCSV(csvData);
    const rawCategories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
    const categories = ['كل المنتجات', ...rawCategories];

    return NextResponse.json({
      success: true,
      categories,
      products,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Data Fetch Error:', error);
    return NextResponse.json({
      success: false,
      error: 'تعذر تحميل قائمة المنتجات حاليًا.'
    }, { status: 500 });
  }
}
