/** Server-side bounds and signature checks for private business-card submissions. */
export const businessCardMaxBytes = 3 * 1024 * 1024;
export type BusinessCardType = 'image/jpeg' | 'image/png';
export function businessCardType(bytes: Uint8Array, declaredType: string): BusinessCardType | null {
  if (!bytes.length || bytes.length > businessCardMaxBytes) return null;
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (declaredType === 'image/png' && png.every((value, index) => bytes[index] === value)) return 'image/png';
  if (declaredType === 'image/jpeg' && bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  return null;
}
