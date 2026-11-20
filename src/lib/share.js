/**
 * Share via the Web Share API; fall back to WhatsApp (very common in Jordan),
 * then to the clipboard. Returns 'shared' | 'whatsapp' | 'copied' | 'cancelled'.
 */
export async function shareText({ title, text, url }) {
  const full = url ? `${text}\n${url}` : text;
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
      // fall through to other options
    }
  }
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    window.open(`https://wa.me/?text=${encodeURIComponent(full)}`, '_blank', 'noopener');
    return 'whatsapp';
  }
  try {
    await navigator.clipboard.writeText(full);
    return 'copied';
  } catch {
    window.open(`https://wa.me/?text=${encodeURIComponent(full)}`, '_blank', 'noopener');
    return 'whatsapp';
  }
}
