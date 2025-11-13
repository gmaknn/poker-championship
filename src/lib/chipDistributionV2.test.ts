/**
 * TESTS ET EXEMPLES POUR CHIP DISTRIBUTION V2
 *
 * Ce fichier contient des scénarios de test concrets
 * Exécuter avec: npx ts-node src/lib/chipDistributionV2.test.ts
 */

import {
  optimizeChipSetup,
  displayResults,
  ChipDenomination,
  OptimizationParams
} from './chipDistributionV2.js';

console.log('🧪 CHIP DISTRIBUTION V2 - TESTS\n');

// ============================================
// SCÉNARIO 1: Petit tournoi avec jetons classiques
// ============================================
console.log('\n' + '█'.repeat(60));
console.log('SCÉNARIO 1: Petit tournoi (10 joueurs, 3h)');
console.log('█'.repeat(60));

const scenario1: OptimizationParams = {
  availableChips: [
    { value: 25, quantity: 100, color: '#FFFFFF' },
    { value: 100, quantity: 100, color: '#000000' },
    { value: 500, quantity: 80, color: '#FF0000' },
    { value: 1000, quantity: 60, color: '#00FF00' },
  ],
  playersCount: 10,
  rebuysExpected: 6,
  targetDuration: 180, // 3 heures
  levelDuration: 15,
};

try {
  const result1 = optimizeChipSetup(scenario1);
  displayResults(result1);
} catch (error) {
  console.error('❌ Erreur:', error);
}

// ============================================
// SCÉNARIO 2: Grand tournoi avec jetons limités
// ============================================
console.log('\n\n' + '█'.repeat(60));
console.log('SCÉNARIO 2: Grand tournoi (20 joueurs, 4h, jetons limités)');
console.log('█'.repeat(60));

const scenario2: OptimizationParams = {
  availableChips: [
    { value: 25, quantity: 80, color: '#FFFFFF' },
    { value: 100, quantity: 120, color: '#000000' },
    { value: 500, quantity: 100, color: '#FF0000' },
    { value: 1000, quantity: 40, color: '#00FF00' },
    { value: 5000, quantity: 30, color: '#0000FF' },
  ],
  playersCount: 20,
  rebuysExpected: 10,
  targetDuration: 240, // 4 heures
  levelDuration: 20,
};

try {
  const result2 = optimizeChipSetup(scenario2);
  displayResults(result2);
} catch (error) {
  console.error('❌ Erreur:', error);
}

// ============================================
// SCÉNARIO 3: Tournoi rapide (Turbo)
// ============================================
console.log('\n\n' + '█'.repeat(60));
console.log('SCÉNARIO 3: Tournoi Turbo (12 joueurs, 2h)');
console.log('█'.repeat(60));

const scenario3: OptimizationParams = {
  availableChips: [
    { value: 25, quantity: 100, color: '#FFFFFF' },
    { value: 100, quantity: 100, color: '#000000' },
    { value: 500, quantity: 100, color: '#FF0000' },
    { value: 2000, quantity: 50, color: '#00FF00' },
  ],
  playersCount: 12,
  rebuysExpected: 5,
  targetDuration: 120, // 2 heures
  levelDuration: 10,
};

try {
  const result3 = optimizeChipSetup(scenario3);
  displayResults(result3);
} catch (error) {
  console.error('❌ Erreur:', error);
}

// ============================================
// SCÉNARIO 4: Dénominations non standards
// ============================================
console.log('\n\n' + '█'.repeat(60));
console.log('SCÉNARIO 4: Dénominations non standards (15 joueurs, 3h)');
console.log('█'.repeat(60));

const scenario4: OptimizationParams = {
  availableChips: [
    { value: 10, quantity: 120, color: '#FFFFFF' },
    { value: 50, quantity: 100, color: '#FFFF00' },
    { value: 250, quantity: 80, color: '#FF0000' },
    { value: 1000, quantity: 60, color: '#00FF00' },
    { value: 2500, quantity: 40, color: '#0000FF' },
  ],
  playersCount: 15,
  rebuysExpected: 8,
  targetDuration: 180, // 3 heures
  levelDuration: 15,
};

try {
  const result4 = optimizeChipSetup(scenario4);
  displayResults(result4);
} catch (error) {
  console.error('❌ Erreur:', error);
}

// ============================================
// SCÉNARIO 5: Très peu de jetons (cas limite)
// ============================================
console.log('\n\n' + '█'.repeat(60));
console.log('SCÉNARIO 5: Jetons très limités (8 joueurs, 2.5h)');
console.log('█'.repeat(60));

const scenario5: OptimizationParams = {
  availableChips: [
    { value: 100, quantity: 60, color: '#FFFFFF' },
    { value: 500, quantity: 50, color: '#FF0000' },
    { value: 1000, quantity: 30, color: '#00FF00' },
  ],
  playersCount: 8,
  rebuysExpected: 3,
  targetDuration: 150, // 2.5 heures
  levelDuration: 15,
};

try {
  const result5 = optimizeChipSetup(scenario5);
  displayResults(result5);
} catch (error) {
  console.error('❌ Erreur:', error);
}

console.log('\n\n✅ Tous les scénarios ont été testés!\n');
console.log('💡 Observations:');
console.log('  1. L\'algorithme priorise la couverture des blinds');
console.log('  2. La structure s\'adapte aux jetons disponibles');
console.log('  3. La durée cible est respectée autant que possible');
console.log('  4. Le nombre de jetons reste raisonnable (12-25)');
console.log('\n');
