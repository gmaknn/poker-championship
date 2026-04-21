// Usage: fly ssh console -C "node scripts/audit-tournament-5.mjs"
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const ts = await prisma.tournament.findMany({
    where: { type: 'CHAMPIONSHIP' },
    select: {
      id: true, name: true, date: true, status: true,
      createdAt: true, updatedAt: true, createdById: true,
      createdBy: { select: { nickname: true, firstName: true, lastName: true } },
      _count: { select: { tournamentPlayers: true } },
    },
    orderBy: { date: 'asc' },
  });
  for (const t of ts) {
    console.log(`${t.name} | date=${t.date.toISOString().slice(0,10)} | status=${t.status} | inscrits=${t._count.tournamentPlayers} | createdAt=${t.createdAt.toISOString()} | by=${t.createdBy?.nickname ?? '-'}`);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
