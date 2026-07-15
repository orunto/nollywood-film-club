import { NextResponse } from 'next/server';
import { stackServerApp } from '../stack';
import { isAdminUser } from './roles';

export async function authenticateAdmin() {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Role is read from clientReadOnlyMetadata, which the client cannot write.
    // See lib/roles.ts for why this is the security boundary.
    if (!isAdminUser(user)) {
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