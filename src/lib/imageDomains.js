// Central configuration for allowed image domains
// Used both in next.config.mjs and in the SafeImage component to validate URLs before loading them.

export const ALLOWED_IMAGE_DOMAINS = [
  'm.media-amazon.com',
  'images-na.ssl-images-amazon.com',
  'images.amazon.com',
  'lh3.googleusercontent.com',
  'lh4.googleusercontent.com',
  'lh5.googleusercontent.com',
  'lh6.googleusercontent.com',
  'encrypted-tbn0.gstatic.com',
  'encrypted-tbn1.gstatic.com',
  'encrypted-tbn2.gstatic.com',
  'encrypted-tbn3.gstatic.com',
  'i.ibb.co',
  'ibb.co',
  'cloudinary.com',
  'imgur.com',
  'githubusercontent.com',
  'wikimedia.org',
  'upload.wikimedia.org'
];

export const ALLOWED_IMAGE_WILDCARDS = [
  '*.cloudinary.com',
  '*.imgur.com',
  '*.githubusercontent.com',
];

/**
 * Checks whether a given URL is allowed by the remote patterns configuration.
 * Local paths (starting with /) and Data URIs are always allowed.
 */
export function isDomainAllowed(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  if (trimmed === '') return false;
  
  // Local paths and data URIs are handled locally
  if (trimmed.startsWith('/') || trimmed.startsWith('data:')) {
    return true;
  }
  
  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLowerCase();
    
    // Check direct matches
    if (ALLOWED_IMAGE_DOMAINS.includes(hostname)) {
      return true;
    }
    
    // Check wildcard matches (e.g. *.cloudinary.com matches foo.cloudinary.com)
    for (const wildcard of ALLOWED_IMAGE_WILDCARDS) {
      if (wildcard.startsWith('*.')) {
        const domain = wildcard.slice(2);
        if (hostname === domain || hostname.endsWith('.' + domain)) {
          return true;
        }
      }
    }
    
    return false;
  } catch (e) {
    return false;
  }
}
