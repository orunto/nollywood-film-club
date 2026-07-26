import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/admin-auth';
import { generateImagePublicName } from '@/lib/utils';
import {
  cloudinary,
  configureCloudinary,
  missingCloudinaryEnv,
  CLOUDINARY_FOLDER,
} from '@/lib/cloudinary';

// Cloudinary fetches the remote poster itself, so this only ever streams a
// small JSON body — but the fetch is a network round trip on its side and the
// platform default (10s on Vercel Hobby) is tight for a slow origin.
export const maxDuration = 30;

// Uploads a remote image (e.g. a JustWatch poster) to Cloudinary by URL and
// returns its public ID. Optional title/releaseDate name the upload via
// generateImagePublicName, matching seeded posters.
//
// Browser file uploads do NOT come through here — they go straight from the
// client to Cloudinary using a signature from ./sign, so they aren't capped by
// the serverless request body limit. See app/admin/upload-image-button.tsx.
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
    configureCloudinary();

    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Direct file uploads are not accepted here. Sign the upload via /api/admin/upload-image/sign and post the file to Cloudinary from the browser.',
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.url !== 'string' || !body.url.startsWith('https://')) {
      return NextResponse.json(
        { success: false, error: 'A valid https image "url" is required' },
        { status: 400 }
      );
    }

    const title = typeof body.title === 'string' ? body.title : null;
    const releaseDate = typeof body.releaseDate === 'string' ? body.releaseDate : null;
    const publicId = title ? generateImagePublicName(title, releaseDate) : undefined;

    const result = await cloudinary.uploader.upload(body.url, {
      public_id: publicId,
      folder: CLOUDINARY_FOLDER,
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
    });

    return NextResponse.json({
      success: true,
      data: { publicId: result.public_id, version: result.version },
      message: 'Image uploaded successfully',
    });
  } catch (error) {
    // Cloudinary rejections carry a message and http_code; a blanket "something
    // went wrong" here is what made this route undiagnosable in production.
    const detail =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Unknown error';
    console.error('Error uploading image to Cloudinary:', error);
    return NextResponse.json(
      { success: false, error: `Upload failed: ${detail}` },
      { status: 500 }
    );
  }
}
