import { NextResponse } from 'next/server';
import { getSheetPrices, findSheetPrice, itemWeightInGrams, priceForGrams, roundMoney } from '../../../lib/sheet';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbymsdUn22D0kKq6ZkK6JtYgaZX7oOe1zc29dLT4ViBR4O5bjVUZzVFkCkY0oZW3UIV8AA/exec';

const PRICE_TOLERANCE = 0.01;

// بنعيد حساب سعر كل بند من أسعار الشيت نفسها بدل ما ناخد سعر العميل زي ما هو.
// لو الشيت مش متاح، الطلب بيكمل زي الأول بدون تحقق (ما نوقفش الطلبات بسبب مشكلة مؤقتة).
async function checkCartAgainstSheet(cart) {
  const result = { cart, total: null, adjusted: false, unverified: false, changes: [] };
  if (!Array.isArray(cart) || cart.length === 0) return result;

  let prices;
  try {
    prices = await getSheetPrices();
  } catch (error) {
    console.error('تعذر قراءة أسعار الشيت، تم إرسال الطلب بدون تحقق:', error);
    result.unverified = true;
    return result;
  }

  let verifiedCount = 0;
  const checkedCart = cart.map((item) => {
    const entry = findSheetPrice(prices, item);
    const grams = itemWeightInGrams(item);
    const expected = entry ? priceForGrams(entry.kiloPrice, grams) : null;

    if (expected === null) {
      result.unverified = true;
      return item;
    }

    verifiedCount += 1;
    const clientPrice = Number(item.price);
    if (!isFinite(clientPrice) || Math.abs(expected - clientPrice) > PRICE_TOLERANCE) {
      result.adjusted = true;
      result.changes.push({
        name: item.name,
        weight: item.weight,
        qty: item.qty,
        clientPrice: isFinite(clientPrice) ? clientPrice : null,
        sheetPrice: expected,
      });
      return { ...item, price: expected };
    }
    return item;
  });

  if (verifiedCount === 0) {
    result.unverified = true;
    return result;
  }

  result.cart = checkedCart;
  result.total = roundMoney(
    checkedCart.reduce((sum, item) => {
      const price = Number(item.price);
      const qty = Number(item.qty);
      if (!isFinite(price) || !isFinite(qty) || qty <= 0) return sum;
      return sum + price * qty;
    }, 0)
  );
  return result;
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (!Array.isArray(body.cart) || body.cart.length === 0) {
      return NextResponse.json({ success: false, error: 'السلة فاضية، من فضلك أضف صنف واحد على الأقل.' }, { status: 400 });
    }

    const hasBadQty = body.cart.some((item) => {
      const qty = Number(item && item.qty);
      return !isFinite(qty) || qty <= 0 || qty > 100;
    });
    if (hasBadQty) {
      return NextResponse.json({ success: false, error: 'في كمية غير صحيحة في السلة، من فضلك راجع الطلب.' }, { status: 400 });
    }

    const check = await checkCartAgainstSheet(body.cart);

    const clientTotal = Number(body.totalAmount);
    const sheetTotal = check.total;
    const totalMismatch =
      sheetTotal !== null && (!isFinite(clientTotal) || Math.abs(sheetTotal - clientTotal) > PRICE_TOLERANCE);

    const finalCart = check.cart;
    const finalTotal = sheetTotal !== null ? sheetTotal : body.totalAmount;
    const adjusted = check.adjusted || totalMismatch;

    // مسار تجربة فقط: بيرجع نتيجة الحساب بدون ما يبعت أي طلب للشيت
    if (body.dryRun === true) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        adjusted,
        unverified: check.unverified,
        clientTotal: isFinite(clientTotal) ? clientTotal : null,
        sheetTotal,
        changes: check.changes,
      });
    }

    const forwardPayload = Object.assign({}, body, {
      cart: finalCart,
      totalAmount: finalTotal,
    });
    delete forwardPayload.action;
    delete forwardPayload.secret;
    delete forwardPayload.dryRun;

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forwardPayload),
    });

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json({ success: false, error: data.error || 'فشل تسجيل الطلب في جوجل شيت' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orderId: data.orderId || body.orderId,
      priceAdjusted: adjusted,
      totalAmount: finalTotal,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.toString() }, { status: 500 });
  }
}
