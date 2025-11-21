const fs = require('fs');
const path = require('path');

// Pages à sécuriser avec AdminGuard
const pagesToSecure = [
  'src/app/dashboard/settings/chip-inventory/page.tsx',
  'src/app/dashboard/settings/templates/page.tsx',
  'src/app/dashboard/communication/page.tsx',
  'src/app/dashboard/chip-assistant/page.tsx',
  'src/app/dashboard/seasons/[id]/exports/page.tsx',
];

function addAdminGuard(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Vérifier si AdminGuard est déjà importé
  if (content.includes('AdminGuard')) {
    console.log(`⏭️  Already secured: ${filePath}`);
    return;
  }

  // Ajouter l'import après les autres imports
  const importRegex = /(import\s+.*from\s+['"]@\/components\/PageHeader['"];?\s*\n)/;
  if (importRegex.test(content)) {
    content = content.replace(importRegex, '$1import { AdminGuard } from \'@/components/auth/AdminGuard\';\n');
  } else {
    // Si PageHeader n'est pas importé, ajouter après le dernier import de composants
    const lastImportRegex = /(import\s+.*from\s+['"]@\/components\/.*['"];?\s*\n)/g;
    const matches = content.match(lastImportRegex);
    if (matches && matches.length > 0) {
      const lastImport = matches[matches.length - 1];
      content = content.replace(lastImport, lastImport + 'import { AdminGuard } from \'@/components/auth/AdminGuard\';\n');
    }
  }

  // Trouver le return principal et l'entourer d'AdminGuard
  // Chercher "export default function" puis le premier "return (" qui n'est pas dans un if/else
  const functionMatch = content.match(/export default function \w+\([^)]*\)\s*\{/);
  if (!functionMatch) {
    console.log(`❌ No function found in: ${filePath}`);
    return;
  }

  const functionStart = functionMatch.index + functionMatch[0].length;
  const remainingContent = content.substring(functionStart);

  // Chercher le dernier return avant la fin de la fonction (généralement le return principal)
  const returnMatches = [...remainingContent.matchAll(/\n\s*return\s*\(/g)];
  if (returnMatches.length === 0) {
    console.log(`❌ No return statement found in: ${filePath}`);
    return;
  }

  const lastReturnMatch = returnMatches[returnMatches.length - 1];
  const returnIndex = functionStart + lastReturnMatch.index;

  // Trouver la fermeture correspondante
  let braceCount = 0;
  let closeIndex = -1;
  let started = false;

  for (let i = returnIndex; i < content.length; i++) {
    if (content[i] === '(' && !started) {
      started = true;
      braceCount++;
    } else if (started) {
      if (content[i] === '(') braceCount++;
      if (content[i] === ')') {
        braceCount--;
        if (braceCount === 0) {
          closeIndex = i;
          break;
        }
      }
    }
  }

  if (closeIndex === -1) {
    console.log(`❌ Could not find closing parenthesis in: ${filePath}`);
    return;
  }

  // Vérifier s'il y a un ; après le )
  let afterClose = content.substring(closeIndex + 1).trim();
  if (afterClose.startsWith(';')) {
    closeIndex++;
  }

  // Extraire le contenu du return
  const returnContent = content.substring(returnIndex, closeIndex + 1);

  // Remplacer le return par une version wrappée
  const wrappedReturn = returnContent.replace(
    /return\s*\(/,
    'return (\n    <AdminGuard requireAdmin={true}>'
  ).replace(/\);?\s*$/, '\n    </AdminGuard>\n  );');

  content = content.substring(0, returnIndex) + wrappedReturn + content.substring(closeIndex + 1);

  // Sauvegarder le fichier
  fs.writeFileSync(fullPath, content);
  console.log(`✅ Secured: ${filePath}`);
}

// Exécuter pour toutes les pages
console.log('🔒 Starting to secure admin pages...\n');
pagesToSecure.forEach(addAdminGuard);
console.log('\n✨ Done!');
