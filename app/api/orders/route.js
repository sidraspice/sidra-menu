import { NextResponse } from 'next/server';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwjgmUi4xGpAnfRIJZ0HWYPfKPYZkDgpYYmMR-zxSJbd1XdP11RGFhRt9jghrdIyT6ZZw/exec';

export async function POST(request) {
  try {
    const body = await request.json();
    
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type') || '';
    const responseText = await response.text();

    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { success: false, error: 'استجاب الخادم الخارجي بصيغة غير صالحة' },
        { status: 502 }
      );
    }

    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data);
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: 'فشل تحليل استجابة الخادم' },
        { status: 502 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.toString() },
      { status: 500 }
    );
  }
}
