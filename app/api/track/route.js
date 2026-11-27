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

    const callScript = async (payload) => {
 const response = await fetch(SCRIPT_URL, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(payload),
 cache: 'no-store',
 redirect: 'follow'
 });
 const text = await response.text();
 try {
 return { data: JSON.parse(text), status: response.status };
 } catch {
 return { data: null, status: 502 };
 }
 };

 const first = await callScript(prefix ? { action: 'track', prefix } : { action: 'track', orderId });
 if (!first.data) {
 return NextResponse.json({ success: false, error: 'تعذر العثور على الطلب أو استجابة غير صالحة من قاعدة البيانات.' }, { status: 502 });
 }

 // لو طُلب resolve ووُجد أوردر واحد بس بالرقم: نجيب تفاصيله هنا في نفس الطلب (بدل رحلة تانية من الموبايل)
 if (prefix && body.resolve === true && first.data.success && Array.isArray(first.data.matches) && first.data.matches.length === 1) {
 const one = first.data.matches[0].orderId;
 if (/^[A-Za-z0-9_-]{1,64}$/.test(String(one))) {
 const second = await callScript({ action: 'track', orderId: one });
 if (second.data) return NextResponse.json(second.data);
 }
 }

 return NextResponse.json(first.data);
 } catch (error) {
    return NextResponse.json({ success: false, error: 'تعذر الاتصال بخدمة المتابعة حاليًا، يرجى المحاولة لاحقًا.' }, { status: 500 });
  }
}

