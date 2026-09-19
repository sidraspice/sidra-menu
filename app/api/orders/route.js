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
    if (!contentType.includes('application/json')) {
      const textResponse = await response.text();
      return NextResponse.json(
        { success: false, error: 'استجاب خادم الخارجي بصيغة غير صالحة' },
        { status: 502 }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.toString() },
      { status: 500 }
    );
  }
}
