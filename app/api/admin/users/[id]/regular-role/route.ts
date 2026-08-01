import { NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/admin-auth';
import { stackServerApp } from '@/stack';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateAdmin();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const { regular } = await request.json();

    const targetUser = await stackServerApp.getUser(id);
    if (!targetUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    // Regular lives alongside role in clientReadOnlyMetadata — writable only
    // here on the server. Unlike role it grants no permission, so no
    // self-toggle guard is needed. See lib/roles.ts.
    const { regular: _regular, ...restMetadata } =
      (targetUser.clientReadOnlyMetadata as Record<string, string | boolean | null>) ?? {};
    const newMetadata = regular ? { ...restMetadata, regular: true } : restMetadata;

    await targetUser.setClientReadOnlyMetadata(newMetadata);

    return NextResponse.json({
      success: true,
      message: regular ? 'User marked as a regular' : 'Regular status removed',
    });
  } catch (error) {
    console.error('Error updating regular status:', error);
    return NextResponse.json({
      success: false,
      error: 'Something went wrong. Please try again.',
    }, { status: 500 });
  }
}
