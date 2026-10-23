/* eslint-disable @typescript-eslint/no-require-imports -- script Node CommonJS exécuté tel quel sur la machine Fly */
// Exécuté SUR la machine Fly (envoyé par scripts/restore-prod.ps1).
// Vérifie la base uploadée puis remplace /data/dev.db (l'ancienne est conservée à côté).
// Usage : node remote-restore.js <horodatage> [avec-avatars]
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');

const UPLOAD = '/data/_restore-upload.db';
const AVATARS_UPLOAD = '/data/_restore-avatars.tgz';
const LIVE = '/data/dev.db';
const ts = process.argv[2];
const withAvatars = process.argv[3] === 'avec-avatars';

(async () => {
  if (!ts) throw new Error('horodatage manquant');
  if (!fs.existsSync(UPLOAD) || fs.statSync(UPLOAD).size === 0) throw new Error('base uploadée absente ou vide');

  // La base uploadée doit être saine avant de toucher à quoi que ce soit
  const up = new PrismaClient({ datasourceUrl: `file:${UPLOAD}` });
  const integrity = await up.$queryRawUnsafe('PRAGMA integrity_check');
  const players = await up.player.count();
  const tournaments = await up.tournament.count();
  await up.$disconnect();
  if (Object.values(integrity[0])[0] !== 'ok') throw new Error('base uploadée corrompue : ' + JSON.stringify(integrity));
  console.log(`Base uploadée OK : ${players} joueurs, ${tournaments} tournois`);

  // Conserver la base actuelle, puis remplacer
  fs.copyFileSync(LIVE, `${LIVE}.before-restore-${ts}`);
  for (const f of [`${LIVE}-wal`, `${LIVE}-shm`, `${LIVE}-journal`]) fs.rmSync(f, { force: true });
  fs.renameSync(UPLOAD, LIVE);
  console.log(`dev.db remplacée (ancienne conservée : ${LIVE}.before-restore-${ts})`);

  if (withAvatars) {
    if (!fs.existsSync(AVATARS_UPLOAD)) throw new Error('archive avatars uploadée absente');
    if (fs.existsSync('/data/avatars')) fs.renameSync('/data/avatars', `/data/avatars.before-restore-${ts}`);
    execSync(`tar -xzf ${AVATARS_UPLOAD} -C /data`);
    fs.rmSync(AVATARS_UPLOAD, { force: true });
    console.log(`Avatars restaurés (anciens conservés : /data/avatars.before-restore-${ts})`);
  }

  console.log('RESTORE_OK');
})().catch((e) => {
  console.error('RESTORE_ERROR', e.message || e);
  process.exit(1);
});
