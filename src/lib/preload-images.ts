/**
 * Pré-charge toutes les images d'un conteneur en base64
 * pour éviter les problèmes CORS lors de la capture PNG avec html-to-image
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

    // Ignorer les images locales (qui n'ont pas de problème CORS)
    if (img.src.startsWith(window.location.origin) || img.src.startsWith('/')) return;

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
