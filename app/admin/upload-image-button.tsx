'use client';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { UploadSimpleIcon } from "@phosphor-icons/react";
import { toast } from 'sonner';

interface UploadImageButtonProps {
  // Used to name the Cloudinary public ID (snake_case title + year)
  title?: string;
  releaseDate?: string;
  onUploaded: (publicId: string) => void;
}

export default function UploadImageButton({ title, releaseDate, onUploaded }: UploadImageButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = async (file: File) => {
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      if (title) form.append('title', title);
      if (releaseDate) form.append('releaseDate', releaseDate);
      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: form,
      });
      const result = await response.json();
      if (result.success) {
        onUploaded(result.data.publicId);
        toast.success('Image uploaded to Cloudinary');
      } else {
        toast.error(result.error || 'Failed to upload image');
      }
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
