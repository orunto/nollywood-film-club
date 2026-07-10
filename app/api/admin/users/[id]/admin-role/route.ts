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
    const { isAdmin } = await request.json();

    if (id === authResult.user.id && !isAdmin) {
      return NextResponse.json({
        success: false,
        error: "You can't remove your own admin access",
      }, { status: 400 });
    }

    const targetUser = await stackServerApp.getUser(id);
    if (!targetUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    const { role: _role, ...restMetadata } =
      (targetUser.clientMetadata as Record<string, string | boolean | null>) ?? {};
    const newMetadata = isAdmin ? { ...restMetadata, role: 'admin' } : restMetadata;

    await targetUser.update({ clientMetadata: newMetadata });

    return NextResponse.json({
      success: true,
      message: isAdmin ? 'User promoted to admin' : 'Admin access removed',
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
