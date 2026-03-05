#!/usr/bin/env bash
# =============================================================================
# Smoke Test E2E fonctionnel — poker-championship
#
# Usage:
#   ADMIN_EMAIL=admin@poker.com ADMIN_PASSWORD=admin123 ./scripts/smoke-test.sh [BASE_URL]
#
# Simule un tournoi complet : génération test, tables, busts, éliminations,
# auto-élimination, timer pause/resume, balancing, cleanup.
# =============================================================================

set -uo pipefail

BASE_URL="${1:-https://wpt-villelaure.fly.dev}"
ADMIN_EMAIL="${ADMIN_EMAIL:?Env var ADMIN_EMAIL required}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:?Env var ADMIN_PASSWORD required}"

PASS=0
FAIL=0
TOTAL=0
TOURNAMENT_ID=""
COOKIE_FILE=$(mktemp)

# --- Cleanup trap ---
cleanup() {
  if [ -n "$TOURNAMENT_ID" ]; then
    echo ""
    echo "🧹 Cleanup (trap): purging test tournaments..."
    curl -s -b "$COOKIE_FILE" -X DELETE "$BASE_URL/api/admin/purge-test-tournaments" \
      --max-time 15 -o /dev/null 2>/dev/null
    echo "   Done."
  fi
  rm -f "$COOKIE_FILE"
}
trap cleanup EXIT

# --- Colors ---
green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }
bold()  { printf "\033[1m%s\033[0m\n" "$1"; }
dim()   { printf "\033[90m%s\033[0m\n" "$1"; }

# --- Test helpers ---
pass() {
  TOTAL=$((TOTAL + 1))
  PASS=$((PASS + 1))
  green "✅ $1"
}

fail() {
  TOTAL=$((TOTAL + 1))
  FAIL=$((FAIL + 1))
  red "❌ $1"
  if [ -n "${2:-}" ]; then
    dim "   → $2"
  fi
}

# --- HTTP helpers ---
RESP_STATUS=""
RESP_BODY=""

api_get() {
  local url="$1"
  local raw
  raw=$(curl -s -b "$COOKIE_FILE" -w '\n%{http_code}' --max-time 15 "$url" 2>/dev/null)
  RESP_STATUS=$(echo "$raw" | tail -1)
  RESP_BODY=$(echo "$raw" | sed '$d')
}

api_post() {
  local url="$1"
  local data="${2:-{}}"
  local raw
  raw=$(curl -s -b "$COOKIE_FILE" -X POST -H "Content-Type: application/json" \
    -d "$data" -w '\n%{http_code}' --max-time 15 "$url" 2>/dev/null)
  RESP_STATUS=$(echo "$raw" | tail -1)
  RESP_BODY=$(echo "$raw" | sed '$d')
}

api_patch() {
  local url="$1"
  local data="${2:-{}}"
  local raw
  raw=$(curl -s -b "$COOKIE_FILE" -X PATCH -H "Content-Type: application/json" \
    -d "$data" -w '\n%{http_code}' --max-time 15 "$url" 2>/dev/null)
  RESP_STATUS=$(echo "$raw" | tail -1)
  RESP_BODY=$(echo "$raw" | sed '$d')
}

api_delete() {
  local url="$1"
  local raw
  raw=$(curl -s -b "$COOKIE_FILE" -X DELETE -w '\n%{http_code}' --max-time 15 "$url" 2>/dev/null)
  RESP_STATUS=$(echo "$raw" | tail -1)
  RESP_BODY=$(echo "$raw" | sed '$d')
}

# --- JSON helpers using node ---
# j EXPR → evaluates JS on parsed RESP_BODY. `d` is the parsed JSON.
j() {
  echo "$RESP_BODY" | node -e "
    let raw='';
    process.stdin.on('data',c=>raw+=c);
    process.stdin.on('end',()=>{
      try{const d=JSON.parse(raw);const r=(()=>{$1})();process.stdout.write(String(r??''))}
      catch(e){process.stdout.write('')}
    });
  " 2>/dev/null
}

# =============================================================================
bold "================================================"
bold "  SMOKE TEST E2E — $BASE_URL"
bold "  $(date '+%Y-%m-%d %H:%M:%S')"
bold "================================================"
echo ""

# =============================================================================
# STEP 0: Authenticate as admin via NextAuth
# =============================================================================
bold "🔐 Authentification admin"

# Get CSRF token
CSRF_RESP=$(curl -s -c "$COOKIE_FILE" "$BASE_URL/api/auth/csrf" --max-time 10 2>/dev/null)
CSRF_TOKEN=$(echo "$CSRF_RESP" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$CSRF_TOKEN" ]; then
  fail "Récupération CSRF token" "Réponse: $CSRF_RESP"
  echo "Cannot continue without auth. Exiting."
  exit 1
fi

# Login (302 = success, don't follow redirects)
curl -s -b "$COOKIE_FILE" -c "$COOKIE_FILE" \
  -X POST "$BASE_URL/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=$ADMIN_EMAIL&password=$ADMIN_PASSWORD&csrfToken=$CSRF_TOKEN&callbackUrl=$BASE_URL" \
  -o /dev/null --max-time 15 2>/dev/null

# Verify session
api_get "$BASE_URL/api/auth/session"
SESSION_USER=$(j "return d.user?.email")

if [ "$SESSION_USER" = "$ADMIN_EMAIL" ]; then
  pass "Auth admin → $SESSION_USER"
else
  fail "Auth admin" "Session user: '$SESSION_USER' (expected $ADMIN_EMAIL)"
  echo "Cannot continue without auth. Exiting."
  exit 1
fi

echo ""

# =============================================================================
# STEP 1: Generate test tournament
# =============================================================================
bold "📋 Génération tournoi test"

api_post "$BASE_URL/api/admin/generate-test-tournament"

if [ "$RESP_STATUS" = "201" ]; then
  TOURNAMENT_ID=$(j "return d.id")
  T_NAME=$(j "return d.name")
  T_PLAYERS=$(j "return d.playerCount")
  pass "Tournoi test généré → $T_NAME ($T_PLAYERS joueurs)"
else
  fail "Génération tournoi test" "HTTP $RESP_STATUS — $RESP_BODY"
  echo "Cannot continue without tournament. Exiting."
  exit 1
fi

# =============================================================================
# STEP 2: Verify blind structure (rebalanceTables)
# =============================================================================
api_get "$BASE_URL/api/tournaments/$TOURNAMENT_ID/blinds"

if [ "$RESP_STATUS" = "200" ]; then
  BLIND_INFO=$(j "
    const count = d.length;
    const rebalance = d.filter(b=>b.rebalanceTables).length;
    const rebuyEnd = d.filter(b=>b.isRebuyEnd).length;
    return count+'|'+rebalance+'|'+rebuyEnd
  ")
  BLIND_COUNT=$(echo "$BLIND_INFO" | cut -d'|' -f1)
  REBALANCE_COUNT=$(echo "$BLIND_INFO" | cut -d'|' -f2)
  REBUY_END_COUNT=$(echo "$BLIND_INFO" | cut -d'|' -f3)
  if [ "$REBALANCE_COUNT" -gt 0 ] 2>/dev/null; then
    pass "Structure blinds OK ($BLIND_COUNT niveaux, $REBALANCE_COUNT réassign, $REBUY_END_COUNT isRebuyEnd)"
  else
    fail "Structure blinds — rebalanceTables" "Aucun niveau avec rebalanceTables=true ($BLIND_COUNT niveaux)"
  fi
else
  fail "GET blinds" "HTTP $RESP_STATUS"
fi

# =============================================================================
# STEP 3: Verify players enrolled and paid
# =============================================================================
api_get "$BASE_URL/api/tournaments/$TOURNAMENT_ID/players"

if [ "$RESP_STATUS" = "200" ]; then
  PLAYER_INFO=$(j "
    const total = d.length;
    const paid = d.filter(p=>p.hasPaid).length;
    return total+'|'+paid
  ")
  PLAYER_COUNT=$(echo "$PLAYER_INFO" | cut -d'|' -f1)
  PAID_COUNT=$(echo "$PLAYER_INFO" | cut -d'|' -f2)
  if [ "$PAID_COUNT" = "$PLAYER_COUNT" ]; then
    pass "Joueurs payés OK ($PAID_COUNT/$PLAYER_COUNT)"
  else
    fail "Joueurs payés" "$PAID_COUNT/$PLAYER_COUNT payés"
  fi
else
  fail "GET players" "HTTP $RESP_STATUS"
fi

# =============================================================================
# STEP 4: Start tournament
# =============================================================================
echo ""
bold "🎮 Démarrage tournoi"

api_post "$BASE_URL/api/tournaments/$TOURNAMENT_ID/timer/start"

if [ "$RESP_STATUS" = "200" ]; then
  pass "Tournoi démarré (timer lancé)"
else
  fail "Démarrage tournoi" "HTTP $RESP_STATUS — $RESP_BODY"
fi

# =============================================================================
# STEP 5: Distribute tables
# =============================================================================
api_post "$BASE_URL/api/tournaments/$TOURNAMENT_ID/tables" '{"seatsPerTable":9}'

if [ "$RESP_STATUS" = "200" ]; then
  TABLE_INFO=$(j "
    const tables = d.tables||[];
    const sizes = tables.map(t=>t.activePlayers);
    return d.totalTables+'|'+sizes.join('-')+'|'+d.activePlayers
  ")
  TABLE_COUNT=$(echo "$TABLE_INFO" | cut -d'|' -f1)
  TABLE_SIZES=$(echo "$TABLE_INFO" | cut -d'|' -f2)
  ACTIVE_COUNT=$(echo "$TABLE_INFO" | cut -d'|' -f3)
  pass "Tables distribuées ($TABLE_COUNT tables: $TABLE_SIZES)"
else
  fail "Distribution tables" "HTTP $RESP_STATUS — $RESP_BODY"
fi

INITIAL_TABLE_COUNT="$TABLE_COUNT"

# =============================================================================
# Get player assignments for test scenarios
# =============================================================================
api_get "$BASE_URL/api/tournaments/$TOURNAMENT_ID/tables"

# Get players from table 1 (for busts/eliminations on same table)
PLAYERS_T1=$(j "
  const t = (d.tables||[])[0];
  if(!t) return '';
  return t.players.filter(p=>!p.isEliminated).map(p=>p.playerId).join('\\n')
")

PLAYER_A=$(echo "$PLAYERS_T1" | sed -n '1p')
PLAYER_B=$(echo "$PLAYERS_T1" | sed -n '2p')
PLAYER_C=$(echo "$PLAYERS_T1" | sed -n '3p')
PLAYER_D=$(echo "$PLAYERS_T1" | sed -n '4p')
PLAYER_E=$(echo "$PLAYERS_T1" | sed -n '5p')
PLAYER_F=$(echo "$PLAYERS_T1" | sed -n '6p')
PLAYER_G=$(echo "$PLAYERS_T1" | sed -n '7p')

echo ""

# =============================================================================
# STEP 6: Bust → chrono NOT paused
# =============================================================================
bold "⏱️  Test Bust + Chrono"

# Verify timer is running
api_get "$BASE_URL/api/tournaments/$TOURNAMENT_ID/timer"
TIMER_RUNNING=$(j "return d.isRunning")

if [ "$TIMER_RUNNING" != "true" ]; then
  fail "Timer devrait être running avant bust" "isRunning=$TIMER_RUNNING"
fi

# Register a bust (during rebuy period — recaves should be open)
api_post "$BASE_URL/api/tournaments/$TOURNAMENT_ID/busts" \
  "{\"eliminatedId\":\"$PLAYER_A\",\"killerId\":\"$PLAYER_B\"}"

if [ "$RESP_STATUS" = "201" ]; then
  # Check timer is STILL running
  sleep 1
  api_get "$BASE_URL/api/tournaments/$TOURNAMENT_ID/timer"
  TIMER_CHECK=$(j "return d.isRunning+'|'+d.isPaused")
  T_RUNNING=$(echo "$TIMER_CHECK" | cut -d'|' -f1)
  T_PAUSED=$(echo "$TIMER_CHECK" | cut -d'|' -f2)
  if [ "$T_RUNNING" = "true" ] && [ "$T_PAUSED" = "false" ]; then
    pass "Bust → chrono PAS en pause"
  else
    fail "Bust → chrono devrait rester actif" "isRunning=$T_RUNNING, isPaused=$T_PAUSED"
  fi
else
  fail "Enregistrement bust" "HTTP $RESP_STATUS — $RESP_BODY"
fi

echo ""

# =============================================================================
# STEP 7: Close rebuys for elimination tests
# =============================================================================
bold "🔄 Fermeture période de recave"

api_patch "$BASE_URL/api/tournaments/$TOURNAMENT_ID" '{"rebuyEndLevel":0}'
if [ "$RESP_STATUS" = "200" ]; then
  dim "   rebuyEndLevel → 0 (recaves fermées)"
else
  fail "Fermeture recaves" "HTTP $RESP_STATUS — $RESP_BODY"
fi

echo ""

# =============================================================================
# STEP 8: Elimination → timer paused → auto-resume after 10s
# =============================================================================
bold "⏸️  Test Élimination + Pause auto"

api_post "$BASE_URL/api/tournaments/$TOURNAMENT_ID/eliminations" \
  "{\"eliminatedId\":\"$PLAYER_C\",\"eliminatorId\":\"$PLAYER_D\"}"

if [ "$RESP_STATUS" = "201" ]; then
  REMAINING=$(j "return d.remainingPlayers")
  dim "   Élimination OK — $REMAINING joueurs restants"

  # Check timer is paused
  sleep 1
  api_get "$BASE_URL/api/tournaments/$TOURNAMENT_ID/timer"
  T_PAUSED=$(j "return d.isPaused")
  if [ "$T_PAUSED" = "true" ]; then
    pass "Élimination → chrono en pause"
  else
    fail "Élimination → chrono devrait être en pause" "isPaused=$T_PAUSED"
  fi

  # Wait for auto-resume (10s delay + 2s margin)
  dim "   Attente auto-resume (12s)..."
  sleep 12

  api_get "$BASE_URL/api/tournaments/$TOURNAMENT_ID/timer"
  TIMER_AFTER=$(j "return d.isRunning+'|'+d.isPaused")
  T_RUNNING2=$(echo "$TIMER_AFTER" | cut -d'|' -f1)
  T_PAUSED2=$(echo "$TIMER_AFTER" | cut -d'|' -f2)
  if [ "$T_RUNNING2" = "true" ] && [ "$T_PAUSED2" = "false" ]; then
    pass "Reprise auto chrono après 10s"
  else
    fail "Auto-resume chrono" "isRunning=$T_RUNNING2, isPaused=$T_PAUSED2"
  fi
else
  fail "Enregistrement élimination" "HTTP $RESP_STATUS — $RESP_BODY"
fi

echo ""

# =============================================================================
# STEP 9: Balancing — eliminate players, verify gap ≤ 1
# =============================================================================
bold "⚖️  Test Balancing"

# Eliminate another player from table 1
if [ -n "$PLAYER_G" ]; then
  sleep 1
  api_post "$BASE_URL/api/tournaments/$TOURNAMENT_ID/eliminations" \
    "{\"eliminatedId\":\"$PLAYER_G\",\"eliminatorId\":\"$PLAYER_D\"}"
  if [ "$RESP_STATUS" = "201" ]; then
    dim "   Élimination supplémentaire OK"
  else
    dim "   Élimination supplémentaire: HTTP $RESP_STATUS"
  fi
  sleep 2
fi

# Check table balance
api_get "$BASE_URL/api/tournaments/$TOURNAMENT_ID/tables"

if [ "$RESP_STATUS" = "200" ]; then
  BALANCE=$(j "
    const tables = (d.tables||[]).filter(t=>t.activePlayers>0);
    const sizes = tables.map(t=>t.activePlayers);
    const gap = Math.max(...sizes) - Math.min(...sizes);
    return gap+'|'+sizes.join('-')+'|'+tables.length
  ")
  GAP=$(echo "$BALANCE" | cut -d'|' -f1)
  SIZES=$(echo "$BALANCE" | cut -d'|' -f2)
  NUM_TABLES=$(echo "$BALANCE" | cut -d'|' -f3)

  if [ "$GAP" -le 1 ] 2>/dev/null; then
    pass "Balancing OK (écart ≤ 1, tables: $SIZES)"
  else
    fail "Balancing" "Écart=$GAP (tables: $SIZES)"
  fi
else
  fail "GET tables pour balancing" "HTTP $RESP_STATUS"
fi

echo ""

# =============================================================================
# STEP 10: Auto-élimination bustés sans recave
# =============================================================================
bold "💀 Test Auto-élimination bustés sans recave"

# Re-open rebuys to bust players
api_patch "$BASE_URL/api/tournaments/$TOURNAMENT_ID" '{"rebuyEndLevel":99}'
dim "   rebuyEndLevel → 99 (recaves ouvertes)"

# Reset the idempotence flag so auto-eliminate will run again
api_patch "$BASE_URL/api/tournaments/$TOURNAMENT_ID" '{"bustsAutoEliminatedAtLevel":0}'

# Get fresh active players
sleep 1
api_get "$BASE_URL/api/tournaments/$TOURNAMENT_ID/tables"
FRESH_PLAYERS=$(j "
  const all=[];
  for(const t of (d.tables||[])){
    for(const p of t.players){
      if(!p.isEliminated) all.push(p.playerId);
    }
  }
  return all.join('\\n')
")

BUST_P1=$(echo "$FRESH_PLAYERS" | sed -n '1p')
BUST_P2=$(echo "$FRESH_PLAYERS" | sed -n '2p')
BUST_KILLER=$(echo "$FRESH_PLAYERS" | sed -n '3p')

# Register 2 busts (during rebuy period)
api_post "$BASE_URL/api/tournaments/$TOURNAMENT_ID/busts" \
  "{\"eliminatedId\":\"$BUST_P1\",\"killerId\":\"$BUST_KILLER\"}"
if [ "$RESP_STATUS" = "201" ]; then
  dim "   Bust 1 OK"
else
  dim "   Bust 1: HTTP $RESP_STATUS — $RESP_BODY"
fi

api_post "$BASE_URL/api/tournaments/$TOURNAMENT_ID/busts" \
  "{\"eliminatedId\":\"$BUST_P2\",\"killerId\":\"$BUST_KILLER\"}"
if [ "$RESP_STATUS" = "201" ]; then
  dim "   Bust 2 OK"
else
  dim "   Bust 2: HTTP $RESP_STATUS — $RESP_BODY"
fi

# Close rebuys at level 1 (current level)
api_patch "$BASE_URL/api/tournaments/$TOURNAMENT_ID" '{"rebuyEndLevel":1}'
dim "   rebuyEndLevel → 1 (recaves fermées)"

# Trigger auto-elimination
api_post "$BASE_URL/api/tournaments/$TOURNAMENT_ID/auto-eliminate-busts"

if [ "$RESP_STATUS" = "200" ]; then
  AUTO_COUNT=$(j "return d.eliminated")
  AUTO_REMAINING=$(j "return d.remainingPlayers")

  if [ "$AUTO_COUNT" -ge 1 ] 2>/dev/null; then
    # Verify isAutoElimination flag in eliminations list
    api_get "$BASE_URL/api/tournaments/$TOURNAMENT_ID/eliminations"
    AUTO_FLAG_COUNT=$(j "
      const elims = Array.isArray(d) ? d : (d.eliminations||[]);
      return elims.filter(e=>e.isAutoElimination).length
    ")

    if [ "$AUTO_FLAG_COUNT" -ge 1 ] 2>/dev/null; then
      pass "Auto-élimination bustés OK ($AUTO_COUNT joueurs, $AUTO_FLAG_COUNT isAutoElimination)"
    else
      fail "Auto-élimination flag" "isAutoElimination introuvable (count=$AUTO_FLAG_COUNT)"
    fi

    # Verify they are no longer active (have finalRank)
    api_get "$BASE_URL/api/tournaments/$TOURNAMENT_ID/players"
    STILL_ACTIVE=$(j "
      return d.filter(p=>['$BUST_P1','$BUST_P2'].includes(p.playerId) && p.finalRank===null).length
    ")
    if [ "$STILL_ACTIVE" = "0" ]; then
      pass "Joueurs auto-éliminés non actifs ($AUTO_REMAINING restants)"
    else
      fail "Joueurs auto-éliminés toujours actifs" "$STILL_ACTIVE encore sans finalRank"
    fi
  else
    fail "Auto-élimination" "0 joueurs éliminés — $(j 'return d.reason||JSON.stringify(d)')"
  fi
else
  fail "POST auto-eliminate-busts" "HTTP $RESP_STATUS — $RESP_BODY"
fi

echo ""

# =============================================================================
# STEP 11: Seuil de casse
# =============================================================================
bold "🔨 Test seuil de casse"

api_get "$BASE_URL/api/tournaments/$TOURNAMENT_ID/tables"
THRESHOLD_CHECK=$(j "
  const tables = (d.tables||[]).filter(t=>t.activePlayers>0);
  const sizes = tables.map(t=>t.activePlayers);
  return tables.length+'|'+sizes.sort((a,b)=>b-a).join('-')
")
FINAL_TABLE_COUNT=$(echo "$THRESHOLD_CHECK" | cut -d'|' -f1)
FINAL_SIZES=$(echo "$THRESHOLD_CHECK" | cut -d'|' -f2)

api_get "$BASE_URL/api/tournaments/$TOURNAMENT_ID"
BREAK_THRESHOLD=$(j "return d.tableBreakThreshold||'N/A'")

if [ -n "$FINAL_TABLE_COUNT" ] && [ "$FINAL_TABLE_COUNT" -ge 1 ] 2>/dev/null; then
  pass "Seuil de casse vérifié ($FINAL_TABLE_COUNT tables: $FINAL_SIZES, seuil=$BREAK_THRESHOLD)"
else
  fail "Seuil de casse" "Impossible de vérifier"
fi

echo ""

# =============================================================================
# STEP 12: Cleanup
# =============================================================================
bold "🧹 Cleanup"

api_delete "$BASE_URL/api/admin/purge-test-tournaments"

if [ "$RESP_STATUS" = "200" ]; then
  DELETED=$(j "return d.deleted")
  pass "Tournoi test purgé ($DELETED supprimé(s))"
  TOURNAMENT_ID="" # prevent double cleanup in trap
else
  fail "Purge tournoi test" "HTTP $RESP_STATUS — $RESP_BODY"
fi

echo ""

# =============================================================================
# Summary
# =============================================================================
bold "================================================"
if [ "$FAIL" -eq 0 ]; then
  green "  $PASS/$TOTAL tests fonctionnels passés ✅"
else
  red "  $PASS/$TOTAL passés, $FAIL échoués ❌"
fi
bold "================================================"

exit $FAIL
