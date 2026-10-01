import { NextResponse } from 'next/server';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbymsdUn22D0kKq6ZkK6JtYgaZX7oOe1zc29dLT4ViBR4O5bjVUZzVFkCkY0oZW3UIV8AA/exec';

export async function POST(request) {
  try {
    const body = await request.json();
    const orderId = body.orderId ? String(body.orderId).trim() : '';

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'يرجى إدخال رقم الطلب.' }, { status: 400 });
    }

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'track', orderId }),
      cache: 'no-store'
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ success: false, error: 'تعذر الاتصال بخدمة المتابعة حاليًا، يرجى المحاولة لاحقًا.' }, { status: 500 });
  }
}
