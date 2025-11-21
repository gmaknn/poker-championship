import { prisma } from './src/lib/prisma';
import bcrypt from 'bcryptjs';

async function testLogin() {
  try {
    console.log('🔐 Test de connexion...\n');

    const admin = await prisma.user.findUnique({
      where: { email: 'admin@poker.com' },
    });

    if (!admin) {
      console.log('❌ Admin non trouvé !');
      return;
    }

    console.log('✅ Admin trouvé :');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Nom: ${admin.name}`);
    console.log(`   Hash: ${admin.password.substring(0, 30)}...`);

    // Test du mot de passe
    const testPassword = 'admin123';
    const isValid = await bcrypt.compare(testPassword, admin.password);

    console.log(`\n🔑 Test mot de passe "${testPassword}":`, isValid ? '✅ VALIDE' : '❌ INVALIDE');

    // Créer un nouveau hash pour admin123
    const newHash = await bcrypt.hash('admin123', 10);
    console.log(`\n💡 Nouveau hash pour "admin123":`);
    console.log(`   ${newHash}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
