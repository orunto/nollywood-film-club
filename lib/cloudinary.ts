import { v2 as cloudinary } from 'cloudinary';

// Every poster lives under this Cloudinary folder, matching the seeded posters
export const CLOUDINARY_FOLDER = 'nfc';

// Reads credentials at request time (not module load) so a cold serverless
// instance always sees the current environment. Returns null when any of the
// three are missing, which is the usual cause of a broken deploy.
export function configureCloudinary() {
  const { NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;
  if (!NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return null;
  }
  cloudinary.config({
    cloud_name: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
  return {
    cloudName: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    apiSecret: CLOUDINARY_API_SECRET,
  };
}

// Names exactly which credentials are absent, so a 500 in production points at
// the variable to set instead of "something went wrong".
export function missingCloudinaryEnv(): string[] {
  return (
    ['NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const
  ).filter((key) => !process.env[key]);
}

export { cloudinary };
