import { supabase } from '@/lib/supabase';

export async function uploadFile(
  bucket: string,
  file: File,
  pathPrefix: string,
  onProgress?: (progress: number) => void
): Promise<string | null> {
  const fileName = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${file.name}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  if (onProgress) onProgress(100);

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}

export async function uploadPrivateFile(
  bucket: string,
  file: File,
  pathPrefix: string,
  onProgress?: (progress: number) => void,
): Promise<string | null> {
  const fileName = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${file.name}`;
  const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    console.error('Private upload error:', error);
    return null;
  }

  onProgress?.(100);
  return data.path;
}
