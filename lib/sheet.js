// قراءة أسعار الشيت (سعر الكيلو لكل صنف) لحساب السعر على السيرفر
// نفس منطق app/api/products/route.js بالظبط، لكن هنا بنبني خريطة أسعار فقط.

const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0KMamBEhCgLLWA4TEsYLz9uvxBE-EShQ0kBON0tYut-dZrBm4BDfuDgf23rD4KlWTt_PgCf--4vQz/pub?output=csv";

const CACHE_TTL_MS = 60 * 1000; // دقيقة واحدة، عشان أي تعديل سعر في الشيت يظهر بسرعة
let cache = { at: 0, prices: null };

function parseCSVLine(text) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      result.push(cur.trim().replace(/^["']|["']$/g, ""));
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur.trim().replace(/^["']|["']$/g, ""));
  return result;
}

function normalizeName(text) {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ىئ\u06CC\u0649]/g, "ي")
    .replace(/[-_()/،,.٫!؟"'\[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// "125 جرام" => 125 | "1 كيلو" => 1000 | "نصف كيلو" => 500
export function parseWeightInGrams(weightValue) {
  if (weightValue === null || weightValue === undefined) return 0;
  const str = weightValue
    .toString()
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .toLowerCase();
  if (!str.trim()) return 0;
  if (str.includes("نصف") || str.includes("نص ")) return 500;
  if (str.includes("ربع")) return 250;
  if (str.includes("ثمن") || str.includes("تمن")) return 125;
  const match = str.match(/\d+(\.\d+)?/);
  if (!match) return 0;
  let grams = parseFloat(match[0]);
  if (str.includes("كيلو") || str.includes("كجم") || str.includes("kg")) grams *= 1000;
  return grams;
}

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

// سعر الجرام من سعر الكيلو في الشيت
// نفس معادلة الموقع بالظبط (toFixed(2)) عشان ما يطلعش فرق قرش في التقريب
const roundPrice = (value) => parseFloat(Number(value).toFixed(2));

export function priceForGrams(kiloPrice, grams) {
  if (!isFinite(kiloPrice) || kiloPrice <= 0) return null;
  if (!isFinite(grams) || grams <= 0) return null;
  return roundPrice((kiloPrice * grams) / 1000);
}

export async function getSheetPrices() {
  if (cache.prices && Date.now() - cache.at < CACHE_TTL_MS) return cache.prices;

  const rawUrl = process.env.GOOGLE_SHEET_CSV_URL || DEFAULT_SHEET_URL;
  const separator = rawUrl.includes("?") ? "&" : "?";
  const res = await fetch(`${rawUrl}${separator}_t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("فشل جلب أسعار الشيت");

  const text = await res.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) throw new Error("ملف أسعار الشيت فاضي");

  const headers = parseCSVLine(lines[0]);
  const clean = headers.map((h) => h.trim().toLowerCase());

  const nameIdx = clean.findIndex(
    (h) => h.includes("منتج") || h.includes("اسم") || h.includes("صنف") || h.includes("name")
  );
  const codeIdx = clean.findIndex((h) => h.includes("كود") || h.includes("code"));
  const newPriceIdx = clean.findIndex(
    (h) => h.includes("جديد") || h.includes("خصم") || h.includes("بعد") || h.includes("عرض")
  );
  const regularPriceIdx = clean.findIndex(
    (h) =>
      (h.includes("سعر") || h.includes("ثمن") || h.includes("price")) &&
      !(h.includes("جديد") || h.includes("خصم") || h.includes("بعد") || h.includes("عرض"))
  );

  if (regularPriceIdx === -1 || nameIdx === -1) throw new Error("أعمدة الشيت غير معروفة");

  const byCode = new Map();
  const byName = new Map();

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const name = values[nameIdx] ? values[nameIdx].trim() : "";
    const regularKilo = parseFloat(values[regularPriceIdx]);
    if (!name || !isFinite(regularKilo) || regularKilo <= 0) continue;

    let kiloPrice = regularKilo;
    if (newPriceIdx !== -1 && values[newPriceIdx]) {
      const newPrice = parseFloat(values[newPriceIdx]);
      if (isFinite(newPrice) && newPrice > 0 && newPrice < regularKilo) kiloPrice = newPrice;
    }

    const entry = { name, kiloPrice };
    const code = codeIdx !== -1 && values[codeIdx] ? values[codeIdx].trim() : "";
    if (code && !byCode.has(code)) byCode.set(code, entry);
    const normName = normalizeName(name);
    if (normName && !byName.has(normName)) byName.set(normName, entry);
  }

  if (byCode.size === 0) throw new Error("مفيش أصناف بأسعار في الشيت");

  cache = { at: Date.now(), prices: { byCode, byName } };
  return cache.prices;
}

// بندور على الصنف بكوده الأول، وبعدين باسمه، عشان أي فرق في الكود ما يمنعش التحقق
export function findSheetPrice(prices, item) {
  if (!prices || !item) return null;
  const code = item.itemCode || item.productId;
  if (code && prices.byCode.has(String(code).trim())) return prices.byCode.get(String(code).trim());
  const normName = normalizeName(item.name);
  if (normName && prices.byName.has(normName)) return prices.byName.get(normName);
  return null;
}

// بندور على وزن البند: بنقراه من نص الوزن اللي بيظهر للعميل ولصاحب المحل،
// وبعدين من unitWeightGrams لو النص مش مقروء
export function itemWeightInGrams(item) {
  const fromWeight = parseWeightInGrams(item && item.weight);
  if (fromWeight > 0) return fromWeight;
  const unit = Number(item && item.unitWeightGrams);
  return isFinite(unit) && unit > 0 ? unit : 0;
}
