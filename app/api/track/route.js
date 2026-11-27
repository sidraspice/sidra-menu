import { NextResponse } from 'next/server';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbymsdUn22D0kKq6ZkK6JtYgaZX7oOe1zc29dLT4ViBR4O5bjVUZzVFkCkY0oZW3UIV8AA/exec';

export async function POST(request) {
  try {
    const body = await request.json();
    const prefix = body.prefix ? String(body.prefix).trim().toUpperCase() : '';
    if (body.prefix && !/^SD-[0-9]{4}-[0-9]{4}$/.test(prefix)) {
      return NextResponse.json({ success: false, error: 'رقم غير صالح.' }, { status: 400 });
    }
    const orderId = body.orderId ? String(body.orderId).trim() : '';

    if (!orderId && !prefix) {
      return NextResponse.json({ success: false, error: 'يرجى إدخال رقم الطلب.' }, { status: 400 });
    }

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefix ? { action: 'track', prefix } : { action: 'track', orderId }),
      cache: 'no-store',
      redirect: 'follow'
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      try {
        const parsed = JSON.parse(text);
        return NextResponse.json(parsed);
      } catch {
        return NextResponse.json({ success: false, error: 'تعذر العثور على الطلب أو استجابة غير صالحة من قاعدة البيانات.' }, { status: 502 });
      }
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ success: false, error: 'تعذر الاتصال بخدمة المتابعة حاليًا، يرجى المحاولة لاحقًا.' }, { status: 500 });
  }
}

