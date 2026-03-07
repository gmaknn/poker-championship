/**
 * Script de migration : ADMIN existants → SUPERADMIN
 *
 * Ce script :
 * 1. Trouve tous les Player avec role = ADMIN
 * 2. Les passe en role = SUPERADMIN
 * 3. Leur ajoute un PlayerRoleAssignment ADMIN (pour garder la compatibilité)
 * 4. Met à jour les User (NextAuth) avec role = ADMIN → SUPERADMIN
 *
 * Usage : npx tsx prisma/seed-superadmin.ts
 * Idempotent : peut être exécuté plusieurs fois sans effet de bord.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Migration ADMIN → SUPERADMIN...\n');

  // 1. Migrer les Players avec role ADMIN → SUPERADMIN
  const adminPlayers = await prisma.player.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, firstName: true, lastName: true, nickname: true },
  });

  console.log(`📋 ${adminPlayers.length} Player(s) avec role ADMIN trouvé(s)`);

  for (const player of adminPlayers) {
    // Mettre à jour le rôle principal
    await prisma.player.update({
      where: { id: player.id },
      data: { role: 'SUPERADMIN' },
    });

    // Ajouter un PlayerRoleAssignment ADMIN (si pas déjà existant)
    await prisma.playerRoleAssignment.upsert({
      where: {
        playerId_role: {
          playerId: player.id,
          role: 'ADMIN',
        },
      },
      update: {},
      create: {
        playerId: player.id,
        role: 'ADMIN',
      },
    });

    // Ajouter aussi SUPERADMIN en role assignment pour cohérence
    await prisma.playerRoleAssignment.upsert({
      where: {
        playerId_role: {
          playerId: player.id,
          role: 'SUPERADMIN',
        },
      },
      update: {},
      create: {
        playerId: player.id,
        role: 'SUPERADMIN',
      },
    });

    console.log(`  ✅ ${player.nickname} (${player.firstName} ${player.lastName}) → SUPERADMIN`);
  }

  // 2. Migrer les User (NextAuth) avec role ADMIN → SUPERADMIN
  const adminUsers = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, email: true, name: true },
  });

  console.log(`\n📋 ${adminUsers.length} User(s) NextAuth avec role ADMIN trouvé(s)`);

  for (const user of adminUsers) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'SUPERADMIN' },
    });

    console.log(`  ✅ ${user.name} (${user.email}) → SUPERADMIN`);
  }

  console.log('\n🎉 Migration terminée !');
  console.log(`   ${adminPlayers.length} Player(s) migrés`);
  console.log(`   ${adminUsers.length} User(s) migrés`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors de la migration :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
