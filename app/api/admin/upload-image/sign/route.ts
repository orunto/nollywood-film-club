import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/admin-auth';
import { generateImagePublicName } from '@/lib/utils';
import {
  cloudinary,
  configureCloudinary,
  missingCloudinaryEnv,
  CLOUDINARY_FOLDER,
} from '@/lib/cloudinary';

// Issues a short-lived signature so the browser can PUT the image directly to
// Cloudinary. The file never touches this function, which keeps uploads clear
// of the platform's request body limit (4.5MB on Vercel) — the reason large
// posters 500'd in deployment while working in `next dev`.
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateAdmin();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const missing = missingCloudinaryEnv();
    if (missing.length > 0) {
      console.error('Cloudinary env vars missing:', missing.join(', '));
      return NextResponse.json(
        {
          success: false,
          error: `Cloudinary is not configured. Missing: ${missing.join(', ')}`,
        },
        { status: 500 }
      );
    }
    const config = configureCloudinary()!;

    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === 'string' ? body.title : null;
    const releaseDate = typeof body.releaseDate === 'string' ? body.releaseDate : null;

    // Derived server-side: the client never gets to choose where it writes.
    const publicId = title ? generateImagePublicName(title, releaseDate) : undefined;

    const timestamp = Math.round(Date.now() / 1000);
    // Every param signed here must be sent verbatim in the browser's upload
    // request, or Cloudinary rejects it with "Invalid Signature".
    const paramsToSign: Record<string, string | number> = {
      timestamp,
      folder: CLOUDINARY_FOLDER,
      overwrite: 'true',
      invalidate: 'true',
    };
    if (publicId) paramsToSign.public_id = publicId;

    const signature = cloudinary.utils.api_sign_request(paramsToSign, config.apiSecret);

    return NextResponse.json({
      success: true,
      data: { ...paramsToSign, signature, apiKey: config.apiKey, cloudName: config.cloudName },
    });
  } catch (error) {
    console.error('Error signing Cloudinary upload:', error);
    return NextResponse.json(
      { success: false, error: 'Could not prepare the upload. Please try again.' },
      { status: 500 }
    );
  }
}
