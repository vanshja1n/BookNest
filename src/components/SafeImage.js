'use client';

import Image from 'next/image';
import { useState, useCallback, useMemo } from 'react';
import { isDomainAllowed } from '@/lib/imageDomains';

// Static fallback paths (served from /public)
const BOOK_FALLBACK = '/default-book.svg';
const PROFILE_FALLBACK = '/default-avatar.svg';

/**
 * Checks whether a given value is a valid, non-empty image source.
 * Accepts http/https URLs, absolute paths starting with /, and data URIs.
 */
function isValidImageSrc(src) {
  if (!src || typeof src !== 'string') return false;
  const trimmed = src.trim();
  if (trimmed === '') return false;
  
  // Check if it starts with allowed prefixes
  const hasValidPrefix = trimmed.startsWith('data:') || 
                         trimmed.startsWith('/') || 
                         trimmed.startsWith('http://') || 
                         trimmed.startsWith('https://');
  
  if (!hasValidPrefix) return false;

  // Check remote domain whitelist to prevent Next.js hostname errors
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (!isDomainAllowed(trimmed)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[SafeImage Warning] Hostname of image URL "${src}" is not configured in allowed remote patterns. Falling back.`);
      }
      return false;
    }
  }

  return true;
}

export default function SafeImage({
  src,
  alt,
  fallback,
  className,
  type = 'book',
  priority = false,
  fill,
  width,
  height,
  sizes,
  ...props
}) {
  // Determine the appropriate fallback image
  const fallbackSrc = fallback || (type === 'profile' ? PROFILE_FALLBACK : BOOK_FALLBACK);

  // Compute initial source synchronously — never allow empty string
  const initialSrc = useMemo(() => {
    return isValidImageSrc(src) ? src : fallbackSrc;
  }, [src, fallbackSrc]);

  const [imgSrc, setImgSrc] = useState(initialSrc);
  const [hasError, setHasError] = useState(!isValidImageSrc(src));

  // When src prop changes, update the image source
  // We use useMemo to derive the value instead of useEffect to avoid flicker
  const currentSrc = useMemo(() => {
    if (hasError) return fallbackSrc;
    return isValidImageSrc(src) ? src : fallbackSrc;
  }, [src, hasError, fallbackSrc]);

  // Reset error state when src changes
  const effectiveSrc = useMemo(() => {
    if (imgSrc !== initialSrc && !hasError) {
      return imgSrc;
    }
    return currentSrc;
  }, [currentSrc, imgSrc, initialSrc, hasError]);

  // Determine if we need unoptimized mode (for data URIs)
  const isDataUri = typeof effectiveSrc === 'string' && effectiveSrc.startsWith('data:');

  const handleError = useCallback(() => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc);
    }
  }, [hasError, fallbackSrc]);

  const handleLoad = useCallback(() => {
    // Image loaded successfully — no action needed
  }, []);

  // Build the final src — always guaranteed to be non-empty
  const finalSrc = hasError ? fallbackSrc : effectiveSrc;

  // Build image props
  const imageProps = {
    src: finalSrc,
    alt: alt || (type === 'profile' ? 'Profile picture' : 'Book cover'),
    className,
    onError: handleError,
    onLoad: handleLoad,
    priority,
    ...(isDataUri ? { unoptimized: true } : {}),
    ...props,
  };

  // Handle fill vs width/height
  if (fill) {
    imageProps.fill = true;
    if (sizes) imageProps.sizes = sizes;
  } else {
    imageProps.width = width || 200;
    imageProps.height = height || 300;
  }

  return <Image {...imageProps} />;
}
