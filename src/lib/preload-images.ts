/**
 * Génère une URL DiceBear de fallback basée sur le texte alt ou un seed aléatoire
 */
function getDiceBearFallbackUrl(img: HTMLImageElement): string {
  // Essayer d'extraire un seed depuis l'URL originale ou l'alt
  const alt = img.alt || '';
  const seed = alt || `user_${Math.random().toString(36).substring(7)}`;
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
}

/**
 * Pré-charge toutes les images d'un conteneur en base64
 * pour éviter les problèmes CORS lors de la capture PNG avec html-to-image
 *
 * Gère les avatars locaux qui peuvent échouer (404) avec un fallback DiceBear
 */
export async function preloadImagesAsBase64(container: HTMLElement): Promise<void> {
  // Vérifier que querySelectorAll existe (peut ne pas exister dans les mocks de tests)
  if (typeof container.querySelectorAll !== 'function') {
    return;
  }

  const images = container.querySelectorAll('img');

  await Promise.all([...images].map(async (img) => {
    // Ignorer les images déjà en base64 ou sans src
    if (!img.src || img.src.startsWith('data:')) return;

    // Pour les images locales (avatars uploadés), vérifier si elles sont accessibles
    const isLocalImage = img.src.startsWith(window.location.origin) ||
                         img.src.includes('/avatars/') ||
                         (img.src.startsWith('/') && !img.src.startsWith('//'));

    if (isLocalImage) {
      try {
        // Tenter de charger l'image locale
        const response = await fetch(img.src, { method: 'HEAD' });
        if (!response.ok) {
          // L'image n'existe pas, utiliser le fallback DiceBear
          console.warn(`[preloadImages] Local image not found: ${img.src}, using DiceBear fallback`);
          const fallbackUrl = getDiceBearFallbackUrl(img);
          // Charger le fallback et le convertir en base64
          const fallbackResponse = await fetch(fallbackUrl);
          if (fallbackResponse.ok) {
            const blob = await fallbackResponse.blob();
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            img.src = base64;
          }
        }
      } catch (error) {
        // En cas d'erreur, utiliser le fallback DiceBear
        console.warn(`[preloadImages] Failed to check local image: ${img.src}, using fallback`);
        try {
          const fallbackUrl = getDiceBearFallbackUrl(img);
          const fallbackResponse = await fetch(fallbackUrl);
          if (fallbackResponse.ok) {
            const blob = await fallbackResponse.blob();
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            img.src = base64;
          }
        } catch {
          // Cacher l'image si tout échoue
          img.style.display = 'none';
        }
      }
      return;
    }

    // Pour les images externes (DiceBear, etc.), les convertir en base64
    try {
      const response = await fetch(img.src, { mode: 'cors' });
      if (!response.ok) {
        console.warn(`[preloadImages] Failed to fetch: ${img.src} (${response.status})`);
        return;
      }

      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Remplacer le src par la version base64
      img.src = base64;
    } catch (error) {
      console.warn(`[preloadImages] Failed to preload: ${img.src}`, error);
      // Garder l'image originale en cas d'échec
    }
  }));
}
