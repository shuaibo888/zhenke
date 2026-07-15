const allowedExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);

export function createAvatarFileName(userId: number, originalName: string, seed = Date.now()) {
  const cleanedName = originalName.trim().replace(/\\/g, '/').split('/').pop() || 'avatar';
  const parts = cleanedName.split('.');
  const rawExtension = parts.length > 1 ? parts.pop() ?? '' : '';
  const extension = allowedExtensions.has(rawExtension.toLowerCase()) ? rawExtension.toLowerCase() : 'jpg';
  const baseName = (parts.join('.') || cleanedName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return `avatar-${userId}-${seed}-${baseName || 'avatar'}.${extension}`;
}

export async function uploadAvatarFile(file: File, userId: number) {
  const formData = new FormData();
  formData.append('avatar', file);
  formData.append('userId', String(userId));

  const response = await fetch('/api/avatar/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('头像上传失败');
  }

  const result = (await response.json()) as { url?: string };

  if (!result.url) {
    throw new Error('头像上传失败');
  }

  return result.url;
}
