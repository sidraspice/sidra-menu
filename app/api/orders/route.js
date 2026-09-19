import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // إرجاع نجاح فوري للواجهة لكي يفتح الواتساب فوراً وبدون أي انتظار أو أخطاء
    return NextResponse.json({ success: true, message: "تم تمرير الطلب بنجاح" });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.toString() });
  }
}
