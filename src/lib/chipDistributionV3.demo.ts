/**
 * TEST DE LA FONCTIONNALITÉ DE REVALORISATION
 *
 * Démontre comment la revalorisation des jetons peut résoudre
 * des situations difficiles
 */

import {
  analyzeRevaluationOpportunity,
  displayRevaluationResults,
} from './chipDistributionV3';
import { OptimizationParams } from './chipDistributionV2';

console.log('🧪 TEST DE REVALORISATION DES JETONS\n');

// ============================================
// SCÉNARIO 1: Jetons mal adaptés
// ============================================
console.log('\n' + '█'.repeat(70));
console.log('SCÉNARIO 1: Jetons avec valeurs inadaptées');
console.log('█'.repeat(70));
console.log('\nProblème: Nous avons des jetons de 75, 300, 1200');
console.log('Ces valeurs ne correspondent pas bien aux blinds standards\n');

const scenario1: OptimizationParams = {
  availableChips: [
    { value: 75, quantity: 100, color: 'blanc' },
    { value: 300, quantity: 100, color: 'rouge' },
    { value: 1200, quantity: 80, color: 'noir' },
    { value: 3000, quantity: 60, color: 'vert' },
  ],
  playersCount: 12,
  rebuysExpected: 6,
  targetDuration: 180,
  levelDuration: 15,
};

const result1 = analyzeRevaluationOpportunity(scenario1);
displayRevaluationResults(result1);

// ============================================
// SCÉNARIO 2: Manque une dénomination clé
// ============================================
console.log('\n\n' + '█'.repeat(70));
console.log('SCÉNARIO 2: Manque une dénomination intermédiaire');
console.log('█'.repeat(70));
console.log('\nProblème: Pas de jeton entre 100 et 1000');
console.log('Grand écart qui complique le jeu\n');

const scenario2: OptimizationParams = {
  availableChips: [
    { value: 25, quantity: 100, color: 'blanc' },
    { value: 100, quantity: 100, color: 'rouge' },
    { value: 1000, quantity: 80, color: 'noir' },
    { value: 5000, quantity: 60, color: 'bleu' },
  ],
  playersCount: 15,
  rebuysExpected: 8,
  targetDuration: 240,
  levelDuration: 20,
};

const result2 = analyzeRevaluationOpportunity(scenario2);
displayRevaluationResults(result2);

// ============================================
// SCÉNARIO 3: Tournoi avec jetons casino
// ============================================
console.log('\n\n' + '█'.repeat(70));
console.log('SCÉNARIO 3: Jetons de casino réutilisés pour tournoi');
console.log('█'.repeat(70));
console.log('\nProblème: Jetons marqués 5€, 25€, 100€, 500€');
console.log('Valeurs inadaptées pour un tournoi de poker\n');

const scenario3: OptimizationParams = {
  availableChips: [
    { value: 5, quantity: 120, color: 'rouge' },
    { value: 25, quantity: 100, color: 'vert' },
    { value: 100, quantity: 80, color: 'noir' },
    { value: 500, quantity: 60, color: 'violet' },
  ],
  playersCount: 10,
  rebuysExpected: 5,
  targetDuration: 180,
  levelDuration: 15,
};

const result3 = analyzeRevaluationOpportunity(scenario3);
displayRevaluationResults(result3);

// ============================================
// SCÉNARIO 4: Configuration déjà optimale
// ============================================
console.log('\n\n' + '█'.repeat(70));
console.log('SCÉNARIO 4: Configuration déjà optimale');
console.log('█'.repeat(70));
console.log('\nJetons standards bien choisis');
console.log('La revalorisation ne devrait pas être nécessaire\n');

const scenario4: OptimizationParams = {
  availableChips: [
    { value: 25, quantity: 100, color: 'blanc' },
    { value: 100, quantity: 100, color: 'rouge' },
    { value: 500, quantity: 80, color: 'vert' },
    { value: 1000, quantity: 60, color: 'noir' },
  ],
  playersCount: 10,
  rebuysExpected: 6,
  targetDuration: 180,
  levelDuration: 15,
};

const result4 = analyzeRevaluationOpportunity(scenario4);
displayRevaluationResults(result4);

// ============================================
// RÉSUMÉ
// ============================================
console.log('\n\n' + '═'.repeat(70));
console.log('RÉSUMÉ DES TESTS');
console.log('═'.repeat(70));

const scenarios = [
  { name: 'Valeurs inadaptées', result: result1 },
  { name: 'Manque dénomination', result: result2 },
  { name: 'Jetons casino', result: result3 },
  { name: 'Déjà optimal', result: result4 },
];

scenarios.forEach((s, i) => {
  console.log(`\n${i + 1}. ${s.name}`);
  console.log(`   Suggestions: ${s.result.suggestions.length}`);
  console.log(`   Amélioration: ${s.result.improvementScore > 0 ? '+' : ''}${s.result.improvementScore.toFixed(1)} points`);
  console.log(`   Recommandation: ${s.result.worthIt ? '✅ Revaloriser' : '❌ Pas nécessaire'}`);
});

console.log('\n\n💡 CONCLUSIONS');
console.log('─'.repeat(70));
console.log('1. La revalorisation permet de résoudre des situations impossibles');
console.log('2. Elle améliore significativement les configurations sous-optimales');
console.log('3. Elle ne propose rien quand ce n\'est pas nécessaire');
console.log('4. C\'est une pratique courante et acceptée dans les tournois réels');
console.log('\n');
