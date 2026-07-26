'use client';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { UploadSimpleIcon } from "@phosphor-icons/react";
import { toast } from 'sonner';

// Cloudinary caps image uploads at 10MB. Checked here rather than imported from
// lib/cloudinary, which pulls in the Node SDK and can't reach the browser.
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface UploadImageButtonProps {
  // Used to name the Cloudinary public ID (snake_case title + year)
  title?: string;
  releaseDate?: string;
  onUploaded: (publicId: string, version: number) => void;
}

export default function UploadImageButton({ title, releaseDate, onUploaded }: UploadImageButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // The file goes browser -> Cloudinary directly. Routing it through our own
  // API meant a base64 copy of the image had to fit inside the serverless
  // request body limit (4.5MB on Vercel), which `next dev` doesn't enforce —
  // hence uploads that worked locally and 500'd once deployed.
  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files can be uploaded');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image must be 10MB or smaller');
      return;
    }

    setIsUploading(true);
    try {
      // Admin-gated: the signature is what authorises the upload.
      const signResponse = await fetch('/api/admin/upload-image/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, releaseDate }),
      });
      const signResult = await signResponse.json();
      if (!signResult.success) {
        toast.error(signResult.error || 'Failed to prepare the upload');
        return;
      }

      const { cloudName, apiKey, signature, timestamp, folder, overwrite, invalidate, public_id } =
        signResult.data;

      // Every signed param must be echoed back exactly, or Cloudinary 401s.
      const form = new FormData();
      form.append('file', file);
      form.append('api_key', apiKey);
      form.append('timestamp', String(timestamp));
      form.append('signature', signature);
      form.append('folder', folder);
      form.append('overwrite', overwrite);
      form.append('invalidate', invalidate);
      if (public_id) form.append('public_id', public_id);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: form }
      );
      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok) {
        toast.error(uploadResult?.error?.message || 'Cloudinary rejected the upload');
        return;
      }

      onUploaded(uploadResult.public_id, uploadResult.version);
      toast.success('Image uploaded to Cloudinary');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className="border-black text-black bg-transparent hover:bg-black hover:text-white rounded-sm shadow-none shrink-0"
      >
        <UploadSimpleIcon className="w-4 h-4 mr-2" />
        {isUploading ? 'Uploading…' : 'Upload'}
      </Button>
    </>
  );
}
