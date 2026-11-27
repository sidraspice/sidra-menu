import { NextResponse } from 'next/server';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbymsdUn22D0kKq6ZkK6JtYgaZX7oOe1zc29dLT4ViBR4O5bjVUZzVFkCkY0oZW3UIV8AA/exec';


// كلمة سر التأكيد: تُضبط في Vercel كمتغير بيئة ADMIN_CONFIRM_PASSWORD
function passwordOk(input) {
  const expected = process.env.ADMIN_CONFIRM_PASSWORD || '';
  if (!expected || typeof input !== 'string' || input.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ input.charCodeAt(i);
  return diff === 0;
}

function escapeHtml(v) {
  return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawId = searchParams.get('id');
  const orderId = rawId && /^[A-Za-z0-9_-]{1,64}$/.test(rawId) ? rawId : null;

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

  const html = `
    <html dir="rtl">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>تأكيد الطلب</title>
        <style>
          body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; padding: 20px; background: #f8fafc; }
          .card { background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); text-align: center; display: none; width: 100%; max-width: 400px; }
          .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #2d533e; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
        <script>
          window.showGate = function() {
            document.getElementById('notice').style.display = 'none';
            document.getElementById('gate').style.display = 'block';
          }
          window.confirmOrder = async function() {
            const pw = document.getElementById('pw').value;
            document.getElementById('gate').style.display = 'none';
            document.getElementById('loading').style.display = 'block';
            try {
              const response = await fetch('/api/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: ${JSON.stringify(orderId)}, password: pw })
              });
              const data = await response.json();

              document.getElementById('loading').style.display = 'none';

              if (data.success) {
                document.getElementById('success').style.display = 'block';
              } else if (data.message === 'already_confirmed') {
                document.getElementById('warning').style.display = 'block';
              } else {
                document.getElementById('error-msg').innerText = data.error || 'حدث خطأ مجهول';
                document.getElementById('error-note').style.display = response.status === 401 ? 'none' : 'block';
                document.getElementById('error').style.display = 'block';
              }
            } catch (err) {
              document.getElementById('loading').style.display = 'none';
              document.getElementById('error-msg').innerText = err.message;
              document.getElementById('error').style.display = 'block';
            }
          }
        </script>
      </head>
      <body>
        <div id="notice" style="text-align: center; width: 100%; max-width: 400px;">
          <h1 style="font-size: 50px; margin: 0 0 15px 0;">🔒</h1>
          <h2 style="color: #2d533e; margin: 0 0 10px 0;">هذه الصفحة خاصة بإدارة المتجر فقط</h2>
          <p style="color: #666; margin: 0 0 25px 0; line-height: 1.7;">تأكيد الطلبات متاح للإدارة فقط. لو كنت عميلًا فلا يلزمك أي إجراء هنا، وسيتواصل معك المتجر بخصوص طلبك.</p>
          <a href="#" onclick="showGate(); return false;" style="font-size: 12px; color: #94a3b8; text-decoration: none;">دخول الإدارة</a>
        </div>

        <div id="gate" style="display: none; text-align: center; width: 100%; max-width: 400px;">
          <h2 style="color: #2d533e; margin: 0 0 15px 0;">تأكيد الطلب ${escapeHtml(orderId)}</h2>
          <input id="pw" type="password" placeholder="كلمة السر" style="width: 100%; box-sizing: border-box; padding: 14px; font-size: 16px; border-radius: 12px; border: 1px solid #ccc; text-align: center;">
          <button onclick="confirmOrder()" style="margin-top: 12px; width: 100%; padding: 14px; font-size: 16px; font-weight: bold; color: white; background: #2d533e; border: 0; border-radius: 12px;">تأكيد الطلب</button>
        </div>

        <div id="loading" style="display: none; text-align: center;">
          <div class="spinner"></div>
          <h2 style="color: #2d533e; margin: 0;">جاري معالجة وتأكيد الطلب...</h2>
          <p style="color: #666; font-size: 15px; font-weight: bold; margin-top: 10px;">يرجى الانتظار ولا تغلق الصفحة</p>
        </div>

        <div id="success" class="card" style="border: 2px solid #bbf7d0;">
          <h1 style="font-size: 60px; margin: 0 0 15px 0;">✅</h1>
          <h2 style="margin: 0 0 10px 0; color: #166534;">تم تأكيد الطلب بنجاح!</h2>
          <p style="margin: 0; font-weight: bold; color: #15803d;">تم نقل الأوردر (${escapeHtml(orderId)}) للشيت الرسمي وخصم البضاعة.</p>
        </div>

        <div id="warning" class="card" style="border: 2px solid #fde68a;">
          <h1 style="font-size: 60px; margin: 0 0 15px 0;">⚠️</h1>
          <h2 style="margin: 0 0 10px 0; color: #b45309;">الطلب مؤكد مسبقاً!</h2>
          <p style="margin: 0; color: #92400e;">هذا الأوردر (${escapeHtml(orderId)}) تم تأكيده وخصمه من المخزن من قبل.</p>
        </div>

        <div id="error" class="card" style="border: 2px solid #fca5a5;">
          <h1 style="font-size: 60px; margin: 0 0 15px 0;">❌</h1>
          <h2 style="margin: 0 0 10px 0; color: #991b1b;">حدث خطأ!</h2>
          <p id="error-note" style="margin: 0; color: #7f1d1d;">الطلب غير موجود في غرفة الانتظار.</p>
          <p id="error-msg" style="font-size: 13px; color: #666; margin-top: 15px; padding: 10px; background: #f1f5f9; border-radius: 8px; direction: ltr;"></p>
        </div>
      </body>
    </html>
  `;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!passwordOk(body.password)) return NextResponse.json({ success: false, error: 'كلمة السر غير صحيحة' }, { status: 401 });
    if (!body.id || !/^[A-Za-z0-9_-]{1,64}$/.test(String(body.id))) return NextResponse.json({ success: false, error: 'No ID' }, { status: 400 });

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm', orderId: body.id }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ success: false, error: error.toString() });
  }
}
