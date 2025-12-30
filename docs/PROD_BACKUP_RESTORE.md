# Production Backup & Restore Guide

This document describes backup and restore procedures for the Poker Championship application deployed on Fly.io.

## Overview

The application uses SQLite as its database, stored on a Fly.io persistent volume mounted at `/data/dev.db`.

## Fly.io Volume Snapshots (Primary Backup Method)

Fly.io automatically creates daily snapshots of volumes. These are the primary backup mechanism.

### Configure Snapshot Retention

By default, Fly.io keeps snapshots for a limited time. Increase retention to 60+ days:

```bash
# List volumes
fly volumes list -a wpt-villelaure

# Update snapshot retention (in days)
fly volumes update <volume_id> --snapshot-retention 60 -a wpt-villelaure
```

### List Available Snapshots

```bash
fly volumes snapshots list <volume_id> -a wpt-villelaure
```

### Restore from Snapshot

To restore from a snapshot:

```bash
# 1. Stop the application
fly scale count 0 -a wpt-villelaure

# 2. Create a new volume from snapshot
fly volumes create poker_data \
  --region cdg \
  --size 1 \
  --snapshot-id <snapshot_id> \
  -a wpt-villelaure

# 3. Detach old volume (if needed)
# Note: You may need to update fly.toml if volume name changed

# 4. Restart the application
fly scale count 1 -a wpt-villelaure

# 5. Verify the restore
fly ssh console -a wpt-villelaure
# Inside the console:
ls -la /data/
sqlite3 /data/dev.db ".tables"
```

## Manual Database Backup

### Download Database Locally

```bash
# SSH into the machine
fly ssh console -a wpt-villelaure

# Inside the machine, create a backup
sqlite3 /data/dev.db ".backup /data/backup-$(date +%Y%m%d-%H%M%S).db"

# Exit SSH
exit

# Download the backup
fly sftp get /data/backup-*.db -a wpt-villelaure
```

### Upload Database Backup

```bash
# Upload a backup file
fly sftp shell -a wpt-villelaure
> put local-backup.db /data/dev.db
> exit

# Restart the app to pick up changes
fly apps restart wpt-villelaure
```

## Pre-Deployment Backup Checklist

Before any deployment that includes database schema changes:

1. **Create manual backup**
   ```bash
   fly ssh console -a wpt-villelaure -C "sqlite3 /data/dev.db '.backup /data/pre-deploy-backup.db'"
   ```

2. **Verify backup exists**
   ```bash
   fly ssh console -a wpt-villelaure -C "ls -la /data/*.db"
   ```

3. **Proceed with deployment**
   ```bash
   fly deploy -a wpt-villelaure
   ```

4. **Verify application health after deployment**
   ```bash
   curl https://wpt-villelaure.fly.dev/api/health
   ```

## Disaster Recovery Procedure

In case of data loss or corruption:

1. **Assess the situation**
   - Check application logs: `fly logs -a wpt-villelaure`
   - Check database integrity: `fly ssh console -a wpt-villelaure -C "sqlite3 /data/dev.db 'PRAGMA integrity_check'"`

2. **Identify restore point**
   - List snapshots: `fly volumes snapshots list <volume_id> -a wpt-villelaure`
   - Choose the most recent snapshot before the incident

3. **Execute restore** (see "Restore from Snapshot" section above)

4. **Verify data integrity**
   ```bash
   fly ssh console -a wpt-villelaure
   sqlite3 /data/dev.db "SELECT COUNT(*) FROM Player;"
   sqlite3 /data/dev.db "SELECT COUNT(*) FROM Tournament;"
   sqlite3 /data/dev.db "SELECT COUNT(*) FROM Season;"
   ```

5. **Test application functionality**
   - Login to dashboard
   - Verify tournament data
   - Check leaderboard displays correctly

## Recommended Backup Schedule

| Type | Frequency | Retention | Method |
|------|-----------|-----------|--------|
| Fly.io Snapshots | Daily (automatic) | 60 days | Configure via `fly volumes update` |
| Pre-deployment | Before each deploy | Keep 3 latest | Manual via SSH |
| Tournament day | Before/after each tournament | Keep for season | Manual download |

## Important Notes

- SQLite backups are atomic when using `.backup` command
- Never manually copy the `.db` file while the app is running (risk of corruption)
- Always verify backups by checking table counts after restore
- Keep at least one backup downloaded locally for critical tournaments
