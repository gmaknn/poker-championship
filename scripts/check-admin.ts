#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    console.log('🔍 Connexion à la base de données...');

    const users = await prisma.user.findMany();
    console.log(`\n📊 Nombre total d'utilisateurs : ${users.length}`);

    if (users.length > 0) {
      console.log('\n👥 Utilisateurs trouvés :');
      users.forEach(user => {
        console.log(`  - Email: ${user.email}`);
        console.log(`    Nom: ${user.name}`);
        console.log(`    Role: ${user.role}`);
        console.log(`    ID: ${user.id}`);
        console.log('');
      });
    } else {
      console.log('\n❌ Aucun utilisateur trouvé dans la base de données !');
    }

  } catch (error) {
    console.error('\n❌ Erreur lors de la vérification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
