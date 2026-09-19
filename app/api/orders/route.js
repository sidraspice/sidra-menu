import { NextResponse } from 'next/server';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbymsdUn22D0kKq6ZkK6JtYgaZX7oOe1zc29dLT4ViBR4O5bjVUZzVFkCkY0oZW3UIV8AA/exec';

export async function POST(request) {
  try {
    const body = await request.json();
    
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!data.success) {
      return NextResponse.json({ success: false, error: data.error || 'فشل تسجيل الطلب في جوجل شيت' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      orderId: data.orderId || body.orderId,
      adminLink: data.adminLink 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.toString() }, { status: 500 });
  }
}
