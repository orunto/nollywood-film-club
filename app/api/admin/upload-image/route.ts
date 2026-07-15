import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { authenticateAdmin } from '@/lib/admin-auth';
import { generateImagePublicName } from '@/lib/utils';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
// Every poster lives under this Cloudinary folder, matching the seeded posters
const CLOUDINARY_FOLDER = 'nfc';

function configureCloudinary(): boolean {
  const { NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;
  if (!NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return false;
  }
  cloudinary.config({
    cloud_name: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
  return true;
}

// Uploads an image to Cloudinary and returns its public ID.
// Accepts either multipart/form-data with a "file" field, or JSON with a
// remote image "url" (e.g. a JustWatch poster). Optional title/releaseDate
// name the upload via generateImagePublicName, matching seeded posters.
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateAdmin();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    if (!configureCloudinary()) {
      return NextResponse.json({
        success: false,
        error: 'Cloudinary credentials are not configured. Set CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.'
      }, { status: 500 });
    }

    let source: string;
    let title: string | null = null;
    let releaseDate: string | null = null;

    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File)) {
        return NextResponse.json({
          success: false,
          error: 'A "file" field is required'
        }, { status: 400 });
      }
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({
          success: false,
          error: 'Only image files can be uploaded'
        }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({
          success: false,
          error: 'Image must be 10MB or smaller'
        }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      source = `data:${file.type};base64,${buffer.toString('base64')}`;
      title = (form.get('title') as string) || null;
      releaseDate = (form.get('releaseDate') as string) || null;
    } else {
      const body = await request.json();
      if (typeof body.url !== 'string' || !body.url.startsWith('https://')) {
        return NextResponse.json({
          success: false,
          error: 'A valid https image "url" is required'
        }, { status: 400 });
      }
      source = body.url;
      title = body.title || null;
      releaseDate = body.releaseDate || null;
    }

    const publicId = title ? generateImagePublicName(title, releaseDate) : undefined;

    const result = await cloudinary.uploader.upload(source, {
      public_id: publicId,
      folder: CLOUDINARY_FOLDER,
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
    });

    return NextResponse.json({
      success: true,
      data: { publicId: result.public_id, version: result.version },
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
