import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:Gm@q28o677!572361@db.zvgorwdhdyirssakhguo.supabase.co:5432/postgres'
});

async function fixPassword() {
  try {
    console.log('🔧 Mise à jour du mot de passe admin...\n');

    // Hash valide pour "admin123" généré par bcrypt
    const validHash = '$2b$10$VUiLBYCHKm2m0jihtMKEQOEMle3uRiLFhD4cqqpRHRVmwidFvXbb2';

    const result = await prisma.user.update({
      where: { email: 'admin@poker.com' },
      data: { password: validHash },
    });

    console.log('✅ Mot de passe mis à jour avec succès !');
    console.log(`   Email: ${result.email}`);
    console.log(`   Nouveau hash: ${result.password.substring(0, 30)}...`);
    console.log('\n🎯 Vous pouvez maintenant vous connecter avec :');
    console.log('   Email: admin@poker.com');
    console.log('   Password: admin123');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPassword();
