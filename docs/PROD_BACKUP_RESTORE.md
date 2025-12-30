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

---

## Validated Restore Procedure (Tested 2025-12-30)

This procedure was validated in a real restore drill. **Total time: 15–20 minutes**.

### Prerequisites

```bash
# Verify Fly CLI is authenticated
fly auth whoami

# Check prod app status
fly status -a wpt-villelaure

# List available snapshots
fly volumes snapshots list <volume_id>
# Example: fly volumes snapshots list vol_v3l7dlxxe9jqw7ov
```

### Step-by-Step Restore to Test Environment

#### 1. Create isolated test app

```bash
fly apps create wpt-villelaure-restore-test --org personal
```

#### 2. Create volume from production snapshot

```bash
# IMPORTANT: Use --snapshot-id, NOT a separate "restore" command
fly volumes create poker_data \
  --size 1 \
  --region cdg \
  --snapshot-id <SNAPSHOT_ID> \
  -a wpt-villelaure-restore-test \
  --yes
```

#### 3. Deploy the application

```bash
fly deploy -a wpt-villelaure-restore-test
```

#### 4. Handle Prisma P3005 error (if encountered)

If the snapshot comes from a database that wasn't baselined, you'll see:

```
Error: P3005
The database schema is not empty.
```

**Fix procedure:**

```bash
# A. Add SKIP_MIGRATIONS=1 to fly.toml [env] section temporarily
# B. Redeploy
fly deploy -a wpt-villelaure-restore-test

# C. SSH and mark migration as applied
fly ssh console -a wpt-villelaure-restore-test \
  -C "npx prisma migrate resolve --applied 0_init"

# D. Remove SKIP_MIGRATIONS from fly.toml
# E. Redeploy normally
fly deploy -a wpt-villelaure-restore-test
```

#### 5. Validate restore

```bash
# Health check
curl https://wpt-villelaure-restore-test.fly.dev/api/health
# Expected: {"ok":true,"db":true,...}

# Verify database file
fly ssh console -a wpt-villelaure-restore-test -C "ls -la /data/dev.db"

# Verify migration status
fly ssh console -a wpt-villelaure-restore-test \
  -C "npx prisma migrate status"
# Expected: "Database schema is up to date!"
```

#### 6. Cleanup (optional)

```bash
# Option A: Keep app stopped for future drills
fly scale count 0 -a wpt-villelaure-restore-test --yes

# Option B: Destroy completely
fly apps destroy wpt-villelaure-restore-test --yes
```

---

## RETEX: Pitfalls Identified During Restore Drill

| Pitfall | Description | Solution |
|---------|-------------|----------|
| ❌ `fly volumes snapshots restore` doesn't exist | Documentation may suggest a "restore" command | ✅ Use `fly volumes create --snapshot-id <ID>` |
| ⚠️ Prisma P3005 after restore | Snapshot from DB without `_prisma_migrations` table | ✅ Baseline manually: deploy with `SKIP_MIGRATIONS=1`, SSH + `prisma migrate resolve --applied 0_init`, redeploy |
| ⚠️ `--yes` required for non-interactive mode | Fly CLI prompts for confirmation | ✅ Always add `--yes` to `fly volumes create`, `fly scale count`, etc. |
| ⚠️ SSH command exit code | SSH commands may return exit code 1 despite success | ✅ Check actual output, not just exit code |

---

## Guarantees After Validated Drill

| Metric | Value |
|--------|-------|
| **Total restore time** | 15–20 minutes |
| **Data loss** | None |
| **Production impact** | None (isolated test app) |
| **Procedure** | Reproducible |
| **Last tested** | 2025-12-30 |
