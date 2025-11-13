const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
const svgPath = path.join(__dirname, '..', 'public', 'icon-base.svg');

// Créer le dossier icons s'il n'existe pas
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log('✅ Dossier icons créé');
}

console.log('🎨 Génération des icônes PWA...\n');

// Générer chaque taille
Promise.all(
  sizes.map(async (size) => {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);

    try {
      await sharp(svgPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 16, g: 185, b: 129, alpha: 1 }
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ Généré: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Erreur pour ${size}x${size}:`, error.message);
    }
  })
).then(() => {
  console.log('\n🎉 Toutes les icônes ont été générées avec succès!');
  console.log(`📁 Emplacement: ${iconsDir}`);
}).catch((error) => {
  console.error('\n❌ Erreur lors de la génération:', error);
});
