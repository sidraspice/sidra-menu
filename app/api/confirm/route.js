import { NextResponse } from 'next/server';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwjgmUi4xGpAnfRIJZ0HWYPfKPYZkDgpYYmMR-zxSJbd1XdP11RGFhRt9jghrdIyT6ZZw/exec';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('id');

  if (!orderId) {
    return new NextResponse(`
      <html dir="rtl">
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #fef2f2; color: #991b1b; text-align: center; margin: 0; padding: 20px;">
          <div><h1 style="font-size: 50px; margin: 0 0 15px 0;">❌</h1><h2>رابط غير صالح!</h2></div>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm', orderId: orderId }),
    });

    const data = await response.json();

    if (data.success) {
      return new NextResponse(`
        <html dir="rtl">
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
          <body style="font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0fdf4; color: #166534; text-align: center; margin: 0; padding: 20px;">
            <div style="background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
              <h1 style="font-size: 60px; margin: 0 0 15px 0;">✅</h1>
              <h2 style="margin: 0 0 10px 0; color: #2d533e;">تم تأكيد الطلب بنجاح!</h2>
              <p style="margin: 0; font-weight: bold;">تم نقل الأوردر (${orderId}) للشيت الرسمي وخصم البضاعة.</p>
            </div>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    } else if (data.message === 'already_confirmed') {
       return new NextResponse(`
        <html dir="rtl">
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
          <body style="font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #fffbeb; color: #b45309; text-align: center; margin: 0; padding: 20px;">
            <div style="background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 2px solid #fde68a;">
              <h1 style="font-size: 60px; margin: 0 0 15px 0;">⚠️</h1>
              <h2 style="margin: 0 0 10px 0;">الطلب مؤكد مسبقاً!</h2>
              <p style="margin: 0;">هذا الأوردر (${orderId}) تم تأكيده وخصمه من المخزن من قبل.</p>
            </div>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    } else {
      throw new Error(data.error || "خطأ مجهول من جوجل سكريبت");
    }

  } catch (error) {
    return new NextResponse(`
      <html dir="rtl">
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #fef2f2; color: #991b1b; text-align: center; margin: 0; padding: 20px;">
          <div style="background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 2px solid #fca5a5;">
            <h1 style="font-size: 60px; margin: 0 0 15px 0;">❌</h1>
            <h2 style="margin: 0 0 10px 0;">حدث خطأ!</h2>
            <p style="margin: 0;">الطلب (${orderId}) غير موجود، أو حدثت مشكلة.</p>
            <p style="font-size: 14px; color: #666; margin-top: 15px; padding: 10px; background: #f1f5f9; border-radius: 8px; text-align: left; direction: ltr; overflow-wrap: break-word;">
              <b>تفاصيل الخطأ:</b> ${error.message}
            </p>
          </div>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}
