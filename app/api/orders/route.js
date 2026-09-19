import { NextResponse } from 'next/server';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwnnmhM0sZFi3uhzWVWcWx5wNADXJ19Of-5oeFgOuw8pXnmm_V5jYBhrUOqAtyGscQVnQ/exec';

export async function POST(request) {
  try {
    const body = await request.json();
    
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ success: false, error: error.toString() });
  }
}
