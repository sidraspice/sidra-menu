import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    
    // سحب الرابط السري اللي إنت لسه ضايفه في Vercel
    const scriptUrl = process.env.GOOGLE_SCRIPT_URL; 

    if (!scriptUrl) {
      throw new Error("لم يتم تكوين GOOGLE_SCRIPT_URL في الخادم.");
    }

    // إرسال البيانات لجوجل شيت
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json({ success: false, error: data.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
