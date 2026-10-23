/* eslint-disable @typescript-eslint/no-require-imports -- script Node CommonJS exécuté tel quel sur la machine Fly */
// Exécuté SUR la machine Fly (envoyé par scripts/backup-prod.ps1, aucun déploiement requis).
// 1. Snapshot cohérent de la base via VACUUM INTO (sûr même si l'app écrit en même temps)
// 2. Vérification d'intégrité + comptages sur le snapshot
// 3. Archive des avatars
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');

const SNAPSHOT = '/data/_backup-snapshot.db';
const AVATARS = '/data/_backup-avatars.tgz';

(async () => {
  for (const f of [SNAPSHOT, AVATARS]) fs.rmSync(f, { force: true });

  const live = new PrismaClient();
  await live.$executeRawUnsafe(`VACUUM INTO '${SNAPSHOT}'`);
  await live.$disconnect();

  const snap = new PrismaClient({ datasourceUrl: `file:${SNAPSHOT}` });
  const integrity = await snap.$queryRawUnsafe('PRAGMA integrity_check');
  const ok = Array.isArray(integrity) && integrity.length === 1 && Object.values(integrity[0])[0] === 'ok';
  const stats = {
    players: await snap.player.count(),
    seasons: await snap.season.count(),
    tournaments: await snap.tournament.count(),
    tournamentPlayers: await snap.tournamentPlayer.count(),
    eliminations: await snap.elimination.count(),
    bustEvents: await snap.bustEvent.count(),
  };
  await snap.$disconnect();
  if (!ok) throw new Error('integrity_check KO : ' + JSON.stringify(integrity));

  execSync(`tar -czf ${AVATARS} -C /data avatars`);

  console.log('BACKUP_STATS ' + JSON.stringify({ integrity: 'ok', ...stats, dbBytes: fs.statSync(SNAPSHOT).size, avatarsBytes: fs.statSync(AVATARS).size }));
})().catch((e) => {
  console.error('BACKUP_ERROR', e.message || e);
  process.exit(1);
});
