import { NextResponse } from 'next/server';
import { stackServerApp } from '../stack';

export async function authenticateUser() {
  try {
    const user = await stackServerApp.getUser();
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    return { user };
  } catch {
    return NextResponse.json({ 
      success: false, 
      error: 'Authentication failed' 
    }, { status: 401 });
  }
}