/**
 * DÉMO SIMPLIFIÉE : Cas où la revalorisation est ESSENTIELLE
 */

import {
  analyzeRevaluationOpportunity,
  displayRevaluationResults,
} from './chipDistributionV3';
import { displayResults } from './chipDistributionV2';
import { OptimizationParams } from './chipDistributionV2';

console.log('🎯 DÉMONSTRATION: Quand la revalorisation sauve la mise\n');
console.log('═'.repeat(70));

// ============================================
// CAS RÉEL : Jetons d'un ancien jeu
// ============================================
console.log('\n📦 SITUATION');
console.log('─'.repeat(70));
console.log('Vous avez récupéré des jetons d\'un ancien jeu:');
console.log('  • 120× jetons "15" (blanc)');
console.log('  • 100× jetons "60" (rouge)');
console.log('  • 80× jetons "250" (bleu)');
console.log('  • 60× jetons "800" (noir)');
console.log('\n❌ Problème: Ces valeurs bizarres ne correspondent à aucune blind standard!');
console.log('');

const scenario: OptimizationParams = {
  availableChips: [
    { value: 15, quantity: 120, color: '#FFFFFF (blanc)' },
    { value: 60, quantity: 100, color: '#FF0000 (rouge)' },
    { value: 250, quantity: 80, color: '#0000FF (bleu)' },
    { value: 800, quantity: 60, color: '#000000 (noir)' },
  ],
  playersCount: 12,
  rebuysExpected: 5,
  targetDuration: 180, // 3 heures
  levelDuration: 15,
};

console.log('\n🔧 SOLUTION 1: Utiliser les valeurs nominales');
console.log('─'.repeat(70));

const { optimizeChipSetup } = require('./chipDistributionV2');

try {
  const result1 = optimizeChipSetup(scenario);
  console.log('\n✅ Configuration trouvée (mais sous-optimale):');
  console.log(`   Stack: ${result1.stackSize}`);
  console.log(`   Score: ${result1.metrics.overallScore.toFixed(1)}/100`);
  console.log(
    `   Couverture: ${result1.metrics.blindCoverageScore.toFixed(1)}%`
  );
  console.log(`   Jetons: ${result1.metrics.totalChipsPerPlayer}`);

  console.log('\n   Problèmes identifiés:');
  result1.analysis.warnings.forEach((w: string) => console.log(`   ⚠️  ${w}`));
} catch (error) {
  console.log('\n❌ IMPOSSIBLE de créer une configuration valide!');
  console.log('   Les valeurs sont trop bizarres...');
}

console.log('\n\n🔧 SOLUTION 2: Revaloriser les jetons par couleur');
console.log('─'.repeat(70));
console.log('\nAu lieu de 15, 60, 250, 800...');
console.log('Utilisons: 25, 100, 500, 1000 (en se basant sur les couleurs)\n');

const revaluedScenario: OptimizationParams = {
  availableChips: [
    { value: 25, quantity: 120, color: '#FFFFFF (blanc, était 15)' },
    { value: 100, quantity: 100, color: '#FF0000 (rouge, était 60)' },
    { value: 500, quantity: 80, color: '#0000FF (bleu, était 250)' },
    { value: 1000, quantity: 60, color: '#000000 (noir, était 800)' },
  ],
  playersCount: 12,
  rebuysExpected: 5,
  targetDuration: 180,
  levelDuration: 15,
};

try {
  const result2 = optimizeChipSetup(revaluedScenario);
  console.log('✅ Configuration OPTIMALE trouvée!\n');
  displayResults(result2);

  console.log('\n💡 INSTRUCTIONS PRATIQUES');
  console.log('─'.repeat(70));
  console.log('Annoncez aux joueurs au début du tournoi:');
  console.log('  "Les jetons BLANCS valent 25"');
  console.log('  "Les jetons ROUGES valent 100"');
  console.log('  "Les jetons BLEUS valent 500"');
  console.log('  "Les jetons NOIRS valent 1000"');
  console.log('\nIgnorer complètement les valeurs inscrites sur les jetons!');
} catch (error) {
  console.log('❌ Erreur:', error);
}

console.log('\n\n📊 ANALYSE AUTOMATIQUE');
console.log('═'.repeat(70));
console.log('\nL\'algorithme peut faire cette analyse automatiquement:\n');

const autoAnalysis = analyzeRevaluationOpportunity(scenario);
displayRevaluationResults(autoAnalysis);

console.log('\n\n✅ CONCLUSION');
console.log('═'.repeat(70));
console.log('La revalorisation par couleur est une pratique courante qui permet:');
console.log('  1. D\'utiliser n\'importe quels jetons disponibles');
console.log('  2. D\'optimiser la structure du tournoi');
console.log('  3. De simplifier les transactions (valeurs rondes)');
console.log('  4. D\'éviter d\'acheter de nouveaux jetons\n');
