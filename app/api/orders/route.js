import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // تمرير الطلب والنجاح فوراً لفتح الواتساب بدون أي انتظار أو أخطاء
    return NextResponse.json({ success: true, message: "تم تمرير الطلب بنجاح" });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.toString() }, { status: 500 });
  }
}
