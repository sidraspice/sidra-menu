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

  if (rawId && !orderId) {
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
            const known = ${JSON.stringify(orderId || '')} || (document.getElementById('oid') ? document.getElementById('oid').value : '');
            const normalized = window.normalizeOrderId(known);
            if (normalized) { document.querySelectorAll('.oid').forEach(function(el) { el.textContent = normalized; }); window.loadSummary(normalized); }
          }

          window.normalizeOrderId = function(raw) {
            let idv = String(raw || '').replace(/[٠-٩]/g, function(d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).replace(/[ ]+/g, '').toUpperCase();
            if (/^[0-9]{8}$/.test(idv)) idv = idv.slice(0, 4) + '-' + idv.slice(4);
            if (/^[0-9]{4}-[0-9]{4}(-[A-Z]{1,2})?$/.test(idv)) idv = 'SD-' + idv;
            return idv;
          }

          window.itemLine = function(it, i) {
            const AR = '٠١٢٣٤٥٦٧٨٩';
            const qty = Number(it.qty) || 1;
            const raw = String(it.weight || '').replace(/[٠-٩]/g, function(c) { return String(AR.indexOf(c)); }).replace(/٫/g, '.');
            const m = raw.match(/^ *([0-9]+([.][0-9]+)?) *(.*)$/);
            let w = raw.trim() + (qty > 1 ? ' × ' + qty : '');
            if (m) {
              const n = Math.round(parseFloat(m[1]) * qty * 100) / 100;
              w = n + (m[3] ? ' ' + m[3].trim() : '');
            }
            w = w.replace('جرام', 'جم').replace('كيلو', 'كجم');
            let nm = String(it.name || '').replace(/ *سدرة */g, ' ').trim();
            if (!nm) nm = String(it.name || '');
            const unit = parseFloat(it.price);
            const pr = isNaN(unit) ? '' : ' - ' + (Math.round(unit * qty * 100) / 100) + ' ج';
            return (i + 1) + '. ' + nm + ' - ' + w + pr;
          }

          window.renderSummary = function(data) {
            const box = document.getElementById('summary');
            const meta = document.getElementById('summary-meta');
            const list = document.getElementById('summary-items');
            const totalEl = document.getElementById('summary-total');
            if (!box) return;
            window.lastSummary = data || null;
            const cb = document.getElementById('copy-note'); if (cb) cb.textContent = '';
            const cp = document.getElementById('copy-preview'); if (cp) cp.style.display = 'none';
            if (!data) { box.style.display = 'none'; return; }
            meta.textContent = '';
            list.textContent = '';
            const parts = [];
            if (data.statusArabic) parts.push(data.statusArabic);
            if (data.zone) parts.push('التوصيل: ' + data.zone);
            meta.textContent = parts.join('  •  ');
            (data.items || []).forEach(function(it, i) {
              const row = document.createElement('div');
              row.style.cssText = 'padding:6px 0; border-bottom:1px solid #e2e8f0; font-size:12px; font-weight:bold; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
              row.textContent = window.itemLine(it, i);
              list.appendChild(row);
            });
            const t = data.total;
            totalEl.textContent = (t === 0 || t) ? (t + ' جنيه') : '—';
            box.style.display = 'block';
          }

          window.lastSummary = null;
          window.buildCustomerMessage = function() {
            const d = window.lastSummary;
            if (!d) return '';
            const NL = String.fromCharCode(10);
            const lines = [];
            lines.push('ده طلبك زي ما اخترته 👇');
            lines.push('');
            (d.items || []).forEach(function(it, i) {
              lines.push(window.itemLine(it, i));
            });
            lines.push('');
            const t = d.total;
            lines.push('الإجمالي: ' + ((t === 0 || t) ? (t + ' جنيه') : '—'));
            lines.push('');
            lines.push('لو مظبوط رد علينا بكلمة «تمام».');
            lines.push('ولو عايز تعدّل في أي حاجة: https://sidra-menu.vercel.app/');
            return lines.join(NL);
          }
          window.copyCustomerMessage = async function() {
            const msg = window.buildCustomerMessage();
            const note = document.getElementById('copy-note');
            if (!msg) { if (note) note.textContent = 'مفيش أوردر ظاهر لسه.'; return; }
            let ok = false;
            try { await navigator.clipboard.writeText(msg); ok = true; } catch (e) {
              try {
                const ta = document.createElement('textarea');
                ta.value = msg; ta.style.position = 'fixed'; ta.style.opacity = '0';
                document.body.appendChild(ta); ta.focus(); ta.select();
                ok = document.execCommand('copy');
                document.body.removeChild(ta);
              } catch (e2) { ok = false; }
            }
            if (note) note.textContent = ok ? 'اتنسخت ✓ ابعتها للعميل في الواتساب' : 'النسخ مارضيش، انسخ الرسالة اللي تحت بإيدك.';
            const prev = document.getElementById('copy-preview');
            if (prev) { prev.value = msg; prev.style.display = ok ? 'none' : 'block'; }
          }

          window.findByPrefix = async function(prefix) {
            try {
              const res = await fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: prefix }) });
              const data = await res.json();
              if (data && data.success && Array.isArray(data.matches)) return data.matches;
              return null;
            } catch (err) { return null; }
          }
          window.pickOrder = function(id) {
            const inp = document.getElementById('oid');
            if (inp) inp.value = id;
            document.querySelectorAll('.oid').forEach(function(el) { el.textContent = id; });
            return window.loadSummary(id);
          }
          window.showPick = function(matches) {
            const pick = document.getElementById('pick');
            if (!pick) return;
            pick.textContent = '';
            const title = document.createElement('div');
            title.style.cssText = 'font-weight:bold; color:#2d533e; margin-bottom:8px;';
            title.textContent = 'في أكتر من أوردر بنفس الرقم، اختار الأوردر:';
            pick.appendChild(title);
            matches.forEach(function(m) {
              const b = document.createElement('button');
              b.type = 'button';
              b.style.cssText = 'display:block; width:100%; margin-top:6px; padding:10px; font-size:14px; font-weight:bold; color:#1e293b; background:white; border:1px solid #cbd5e1; border-radius:10px;';
              b.textContent = m.orderId + (m.status === 'confirmed' ? ' (متأكد)' : ' (منتظر التأكيد)');
              b.onclick = function() { window.pickOrder(m.orderId); };
              pick.appendChild(b);
            });
            pick.style.display = 'block';
          }
          window.lookupToken = 0;
          window.setLoading = function(on) {
            const el = document.getElementById('loading');
            if (el) el.style.display = on ? 'block' : 'none';
          }
          window.loadSummary = async function(idv) {
            const token = ++window.lookupToken;
            window.resolvedId = '';
            const pickBox = document.getElementById('pick');
            if (pickBox) { pickBox.style.display = 'none'; pickBox.textContent = ''; }
            if (!idv) { window.setLoading(false); window.renderSummary(null); return false; }
            window.lastQuery = idv;
            window.setLoading(true);
            try {
              const digitsOnly = /^SD-[0-9]{4}-[0-9]{4}$/.test(idv);
              const res = await fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(digitsOnly ? { prefix: idv, resolve: true } : { orderId: idv })
              });
              const data = await res.json();
              if (token !== window.lookupToken) return false;
              if (data && data.success && data.items) {
                const rid = data.orderId || idv;
                window.renderSummary(data);
                window.resolvedId = rid;
                const inp = document.getElementById('oid');
                if (inp && rid !== idv) { inp.value = rid; window.lastQuery = rid; }
                document.querySelectorAll('.oid').forEach(function(el) { el.textContent = rid; });
                window.setLoading(false);
                return true;
              }
              if (data && data.success && Array.isArray(data.matches) && data.matches.length > 1) {
                window.renderSummary(null); window.showPick(data.matches);
                window.setLoading(false);
                return false;
              }
              window.renderSummary(null);
              window.setLoading(false);
              return false;
            } catch (err) {
              if (token === window.lookupToken) { window.renderSummary(null); window.setLoading(false); }
              return false;
            }
          }
          window.lookupFromInput = function() {
            const el = document.getElementById('oid');
            if (!el) return;
            const n = window.normalizeOrderId(el.value);
            if (!/^SD-[0-9]{4}-[0-9]{4}(-[A-Z]{1,2})?$/.test(n)) return;
            if (n === window.lastQuery) return;
            window.loadSummary(n);
          }
          window.lookupSoon = function() {
            clearTimeout(window.lookupTimer);
            window.lookupTimer = setTimeout(window.lookupFromInput, 500);
          }
          window.confirmOrder = async function() {
            const pw = document.getElementById('pw').value;
            const presetId = ${JSON.stringify(orderId || '')};
            const rawv = presetId || (document.getElementById('oid') ? document.getElementById('oid').value : '');
            let idv = String(rawv).replace(/[٠-٩]/g, function(d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).replace(/[ ]+/g, '').toUpperCase();
            if (/^[0-9]{8}$/.test(idv)) idv = idv.slice(0, 4) + '-' + idv.slice(4);
            if (/^[0-9]{4}-[0-9]{4}(-[A-Z]{1,2})?$/.test(idv)) idv = 'SD-' + idv;
            if (/^SD-[0-9]{4}-[0-9]{4}$/.test(idv)) {
              if (window.resolvedId && (window.resolvedId === idv || window.resolvedId.indexOf(idv + '-') === 0)) {
                idv = window.resolvedId;
              } else {
                await window.loadSummary(idv);
                if (window.resolvedId && (window.resolvedId === idv || window.resolvedId.indexOf(idv + '-') === 0)) {
                  idv = window.resolvedId;
                } else {
                  document.getElementById('gate-msg').innerText = 'مفيش أوردر واحد بالرقم ده. اختار الأوردر من القائمة أو اكتب الرقم كامل.';
                  return;
                }
              }
            }
            if (!/^[A-Za-z0-9_-]{1,64}$/.test(idv)) {
              document.getElementById('gate-msg').innerText = 'اكتب رقم الطلب بشكل صحيح (مثال: 2711-1510)';
              return;
            }
            document.getElementById('gate-msg').innerText = '';
            document.querySelectorAll('.oid').forEach(function(el) { el.textContent = idv; });
            document.getElementById('gate').style.display = 'none';
            document.getElementById('loading').style.display = 'block';
            try {
              const response = await fetch('/api/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: idv, password: pw })
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
          <h2 style="color: #2d533e; margin: 0 0 15px 0;">${orderId ? 'تأكيد الطلب ' + escapeHtml(orderId) : 'تأكيد طلب'}</h2>
          ${orderId ? '' : '<input id="oid" type="text" dir="ltr" placeholder="رقم الطلب مثال: 2711-1510" oninput="window.lookupSoon()" onblur="window.lookupFromInput()" style="width: 100%; box-sizing: border-box; padding: 14px; font-size: 16px; border-radius: 12px; border: 1px solid #ccc; text-align: center; margin-bottom: 10px;">'}

          <div id="loading" style="display: none; text-align: center; color: #2d533e; font-size: 14px; font-weight: bold; margin: 0 0 12px 0;">جاري البحث...</div>
          <div id="pick" style="display: none; text-align: right; margin: 0 0 14px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 14px; background: #f8fafc;"></div>
          <div id="summary" style="display: none; text-align: right; margin: 0 0 14px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 14px; background: #f8fafc;">
            <div style="font-weight: bold; color: #2d533e; margin-bottom: 6px;">الطلب كما هو مسجل في الشيت</div>
            <div id="summary-meta" style="font-size: 12px; color: #475569; margin-bottom: 8px;"></div>
            <div id="summary-items"></div>
            <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 1px dashed #cbd5e1; margin-top: 10px; padding-top: 8px;">
              <span>الإجمالي المسجل:</span><span id="summary-total">—</span>
            </div>
            <button type="button" onclick="copyCustomerMessage()" style="margin-top: 12px; width: 100%; padding: 12px; font-size: 15px; font-weight: bold; color: #2d533e; background: white; border: 2px solid #2d533e; border-radius: 12px;">نسخ رسالة تأكيد للعميل</button>
            <div id="copy-note" style="font-size: 13px; color: #2d533e; margin-top: 6px; text-align: center;"></div>
            <textarea id="copy-preview" readonly rows="8" style="display: none; width: 100%; box-sizing: border-box; margin-top: 8px; padding: 10px; font-size: 13px; border: 1px solid #cbd5e1; border-radius: 10px;"></textarea>
            <div style="font-size: 12px; color: #b45309; margin-top: 8px; line-height: 1.6;">الأصناف والأوزان والإجمالي فوق هم الأصل (من الشيت). ابعت رسالة التأكيد للعميل، ولما يرد «تمام» اكّد الطلب. لا تعتمد على رسالة الواتساب الأولى.</div>
          </div>

          <input id="pw" type="password" placeholder="كلمة السر" style="width: 100%; box-sizing: border-box; padding: 14px; font-size: 16px; border-radius: 12px; border: 1px solid #ccc; text-align: center;">
          <button onclick="confirmOrder()" style="margin-top: 12px; width: 100%; padding: 14px; font-size: 16px; font-weight: bold; color: white; background: #2d533e; border: 0; border-radius: 12px;">تأكيد الطلب</button>
          <p id="gate-msg" style="color: #991b1b; font-size: 14px; margin: 10px 0 0 0;"></p>
        </div>

        <div id="loading" style="display: none; text-align: center;">
          <div class="spinner"></div>
          <h2 style="color: #2d533e; margin: 0;">جاري معالجة وتأكيد الطلب...</h2>
          <p style="color: #666; font-size: 15px; font-weight: bold; margin-top: 10px;">يرجى الانتظار ولا تغلق الصفحة</p>
        </div>

        <div id="success" class="card" style="border: 2px solid #bbf7d0;">
          <h1 style="font-size: 60px; margin: 0 0 15px 0;">✅</h1>
          <h2 style="margin: 0 0 10px 0; color: #166534;">تم تأكيد الطلب بنجاح!</h2>
          <p style="margin: 0; font-weight: bold; color: #15803d;">تم نقل الأوردر (<span class="oid"></span>) للشيت الرسمي وخصم البضاعة.</p>
        </div>

        <div id="warning" class="card" style="border: 2px solid #fde68a;">
          <h1 style="font-size: 60px; margin: 0 0 15px 0;">⚠️</h1>
          <h2 style="margin: 0 0 10px 0; color: #b45309;">الطلب مؤكد مسبقاً!</h2>
          <p style="margin: 0; color: #92400e;">هذا الأوردر (<span class="oid"></span>) تم تأكيده وخصمه من المخزن من قبل.</p>
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
      body: JSON.stringify({ action: 'confirm', orderId: body.id, secret: process.env.CONFIRM_SECRET || '' }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ success: false, error: error.toString() });
  }
}

