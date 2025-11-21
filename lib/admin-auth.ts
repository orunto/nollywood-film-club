import { NextResponse } from 'next/server';
import { stackServerApp } from '../stack';

export async function authenticateAdmin() {
  try {
    const user = await stackServerApp.getUser();
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    // Check user metadata for role
    const userRole = (user as { clientMetadata?: { role?: string } }).clientMetadata?.role;
    
    if (userRole !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        error: 'Admin access required',
        redirectTo: '/user-dashboard'
      }, { status: 403 });
    }

    return { user };
  } catch {
    return NextResponse.json({ 
      success: false, 
      error: 'Authentication failed' 
    }, { status: 401 });
  }
}
