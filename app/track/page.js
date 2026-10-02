'use client';

import React, { useState, useEffect } from 'react';
import { Search, Package, Clock, CheckCircle2, Truck, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';

// تحويل الأرقام العربية المشرقية إلى إنجليزية لضمان صحة البحث
const toEnglishDigits = (str) => {
  if (!str) return '';
  return str.toString().replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦ desert".indexOf(d) !== -1 ? "٠١٢٣٤٥٦٧٨٩".indexOf(d) : "٠١٢٣٤٥٦٧٨٩".indexOf(d));
};

const cleanDigits = (str) => {
  if (!str) return '';
  return str.toString().replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
};

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const queryId = urlParams.get('id');

    if (queryId) {
      setOrderId(queryId);
      performTrack(queryId);
    } else {
      try {
        const saved = localStorage.getItem('sedra_last_order');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.id) {
            setOrderId(parsed.id);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const performTrack = async (idToSearch) => {
    const rawId = (idToSearch || orderId);
    const targetId = cleanDigits(rawId).trim();
    
    if (!targetId) {
      setError('يرجى كتابة رقم الطلب.');
      return;
    }

    setLoading(true);
    setError('');
    setOrderData(null);

    try {
      const res = await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: targetId })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'لم يتم العثور على طلب بهذا الرقم.');
      }

      setOrderData(data);
    } catch (err) {
      setError(err.message || 'تعذر جلب حالة الطلب.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    performTrack();
  };

  return (
    <div className="min-h-screen bg-[#fbf9f4] text-slate-800 p-4 pb-16 font-sans">
      <div className="max-w-md mx-auto">
        
        {/* شريط الرجوع للمتجر */}
        <div className="flex items-center justify-between mb-4">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2d533e] bg-white border border-[#e8e2d5] px-3 py-2 rounded-xl shadow-2xs hover:bg-[#2d533e] hover:text-white transition"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للمنيو</span>
          </a>
          <span className="text-xs font-black text-slate-500">عطارة سدرة</span>
        </div>

        {/* كارت البحث عن الطلب */}
        <div className="bg-white rounded-3xl p-5 border border-[#e8e2d5] shadow-xs mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-[#2d533e]" />
            <h1 className="text-base font-black text-[#1e382b]">متابعة حالة الطلب</h1>
          </div>
          <p className="text-xs font-semibold text-slate-500 mb-4 leading-relaxed">
            أدخل رقم طلبك (مثل: SD-0210-1203) لمعرفة حالة تجهيزه وتوصيله.
          </p>

          <form onSubmit={handleFormSubmit} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                dir="ltr"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="SD-XXXX-XXXX"
                className="w-full py-3 px-4 text-sm font-black rounded-2xl border-2 border-[#e8e2d5] focus:border-[#2d533e] text-center tracking-wider outline-none text-[#1e382b] bg-[#fbf9f4]/40"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2d533e] hover:bg-[#1e382b] disabled:opacity-50 text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري البحث...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>متابعة الطلب</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-bold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* عرض بيانات وحالة الطلب */}
        {orderData && (
          <div className="bg-white rounded-3xl p-5 border border-[#e8e2d5] shadow-sm space-y-4 animate-in fade-in duration-300">
            
            <div className="border-b border-slate-100 pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">رقم الطلب</span>
                  <span className="text-sm font-black text-[#1e382b] tracking-wide" dir="ltr">{orderData.orderId}</span>
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">منطقة التوصيل</span>
                  <span className="text-xs font-black text-slate-700">{orderData.zone}</span>
                </div>
              </div>
            </div>

            {/* مؤشر الحالة */}
            <div className="bg-[#fbf9f4] p-3.5 rounded-2xl border border-[#e8e2d5]">
              <span className="text-[10px] font-bold text-slate-500 block mb-1">حالة الطلب الحالية</span>
              <div className="flex items-center gap-2 mb-1.5">
                {orderData.status === 'pending' && <Clock className="w-5 h-5 text-amber-500" />}
                {orderData.status === 'confirmed' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {orderData.status === 'shipped' && <Truck className="w-5 h-5 text-blue-600" />}
                {orderData.status === 'delivered' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {orderData.status === 'cancelled' && <AlertCircle className="w-5 h-5 text-red-500" />}
                <h3 className="text-sm font-black text-[#1e382b]">{orderData.statusArabic}</h3>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
                {orderData.status === 'pending' && 'تم استلام طلبك بنجاح وهو الآن قيد المراجعة لدى فريق عطارة سدرة.'}
                {orderData.status === 'confirmed' && 'تمت مراجعة وتأكيد طلبك وجاري الآن تجهيزه في قسم التحضير.'}
                {orderData.status === 'shipped' && 'تم تسليم طلبك لشركة الشحن/المندوب وهو في الطريق إليك.'}
                {orderData.status === 'delivered' && 'تم تسليم الطلب لك بنجاح. شكراً لثقتك بعطارة سدرة!'}
                {orderData.status === 'cancelled' && 'تم إلغاء هذا الطلب.'}
              </p>
            </div>

            {/* تفاصيل المنتجات */}
            {orderData.items && orderData.items.length > 0 && (
              <div>
                <h4 className="text-xs font-black text-slate-700 mb-2">المنتجات المطلوبة:</h4>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl p-2.5 bg-slate-50/50">
                  {orderData.items.map((it, idx) => (
                    <div key={idx} className="py-2 first:pt-1 last:pb-1 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-black text-[#1e382b] block">{it.name}</span>
                        <span className="text-[10px] font-bold text-slate-500">{it.weight} (عدد {it.qty})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* إجمالي الفاتورة */}
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center font-black">
              <span className="text-xs text-slate-600">إجمالي الفاتورة:</span>
              <span className="text-sm text-[#2d533e]">{orderData.total} جنيه</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
