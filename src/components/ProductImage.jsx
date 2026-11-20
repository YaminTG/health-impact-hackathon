import { useState } from 'react';
import ProductArt, { hasArt } from './ProductArt.jsx';

const ART_SIZE = { lg: 128, md: 64, sm: 40 };

/**
 * Real product photo (Open Food/Beauty/Products Facts) when we have one,
 * else the drawn packaging for demo products, else the emoji.
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
  if (hasArt(product)) return <ProductArt product={product} size={ART_SIZE[size] || 64} className={`art-${size}`} />;
  return (
    <span className={size === 'lg' ? 'result-emoji' : 'scan-emoji'} aria-hidden="true">
      {product.emoji || '🛒'}
    </span>
  );
}
