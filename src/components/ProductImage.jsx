import { useState } from 'react';

/**
 * Real product photo (from Open Food/Beauty/Products Facts) when we have one,
 * otherwise the emoji. Falls back to the emoji if the image fails (e.g. offline).
 */
export default function ProductImage({ product, size = 'lg', alt = '' }) {
  const [failed, setFailed] = useState(false);
  const src = size === 'lg' ? product.imageLargeUrl || product.imageUrl : product.imageUrl || product.imageLargeUrl;
  if (src && !failed) {
    return (
      <img
        className={`product-img product-img-${size}`}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className={size === 'lg' ? 'result-emoji' : 'scan-emoji'} aria-hidden="true">
      {product.emoji || '🛒'}
    </span>
  );
}
