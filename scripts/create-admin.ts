#!/usr/bin/env tsx
/**
 * Script pour créer un utilisateur admin
 * Usage: DATABASE_URL="..." tsx scripts/create-admin.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function createAdmin() {
  console.log('🔐 Création d\'un utilisateur administrateur\n');

  try {
    // Vérifier la connexion à la base de données
    await prisma.$connect();
    console.log('✅ Connexion à la base de données établie\n');

    // Demander les informations
    const email = await question('Email (par défaut: admin@poker.com): ') || 'admin@poker.com';
    const name = await question('Nom (par défaut: Administrateur): ') || 'Administrateur';
    const password = await question('Mot de passe (par défaut: admin123): ') || 'admin123';

    // Vérifier si l'utilisateur existe déjà
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      const confirm = await question(`\n⚠️  Un utilisateur avec l'email ${email} existe déjà. Voulez-vous mettre à jour son mot de passe ? (y/N): `);
      if (confirm.toLowerCase() !== 'y') {
        console.log('\n❌ Opération annulée');
        rl.close();
        return;
      }
    }

    // Hash du mot de passe
    console.log('\n🔒 Hachage du mot de passe...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer ou mettre à jour l'utilisateur
    const admin = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        name,
      },
      create: {
        email,
        password: hashedPassword,
        name,
        role: 'ADMIN',
      },
    });

    console.log('\n✅ Utilisateur administrateur créé/mis à jour avec succès !');
    console.log('\n📝 Identifiants de connexion :');
    console.log(`   Email    : ${admin.email}`);
    console.log(`   Password : ${password}`);
    console.log(`   Role     : ${admin.role}`);
    console.log('\n⚠️  Conservez ces identifiants en lieu sûr !');

  } catch (error) {
    console.error('\n❌ Erreur lors de la création de l\'administrateur:', error);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

createAdmin();
