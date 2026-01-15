/**
 * TEMPORARY DIAGNOSTIC ENDPOINT
 * Read tournament directly from DB to verify rebuyEndLevel persistence
 * DELETE THIS FILE AFTER DIAGNOSIS
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDiagnosticHeaders } from '@/lib/app-version';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Only allow if RECIPE_DIAGNOSTICS is enabled
  if (process.env.RECIPE_DIAGNOSTICS !== '1') {
    return NextResponse.json(
      { error: 'Diagnostic endpoint disabled' },
      { status: 403 }
    );
  }

  const { id } = await params;

  // Raw DB read - no transformations
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      id: true,
      rebuyEndLevel: true,
      currentLevel: true,
      status: true,
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const response = NextResponse.json({
    _diagnostic: true,
    _timestamp: new Date().toISOString(),
    tournament: {
      id: tournament.id,
      rebuyEndLevel: tournament.rebuyEndLevel,
      rebuyEndLevelType: typeof tournament.rebuyEndLevel,
      rebuyEndLevelIsNull: tournament.rebuyEndLevel === null,
      rebuyEndLevelIsZero: tournament.rebuyEndLevel === 0,
      currentLevel: tournament.currentLevel,
      status: tournament.status,
    },
  });

  const headers = getDiagnosticHeaders();
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * DIAGNOSTIC PATCH - Test rebuyEndLevel persistence
 * DELETE AFTER DIAGNOSIS
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Only allow if RECIPE_DIAGNOSTICS is enabled
  if (process.env.RECIPE_DIAGNOSTICS !== '1') {
    return NextResponse.json(
      { error: 'Diagnostic endpoint disabled' },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await request.json();

  // Trace input
  const inputTrace = {
    bodyRebuyEndLevel: body.rebuyEndLevel,
    bodyType: typeof body.rebuyEndLevel,
    bodyIsNull: body.rebuyEndLevel === null,
    bodyIsZero: body.rebuyEndLevel === 0,
    bodyIsUndefined: body.rebuyEndLevel === undefined,
  };

  // Read BEFORE
  const before = await prisma.tournament.findUnique({
    where: { id },
    select: { rebuyEndLevel: true },
  });

  if (!before) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Perform raw Prisma update with explicit rebuyEndLevel
  const updated = await prisma.tournament.update({
    where: { id },
    data: {
      rebuyEndLevel: body.rebuyEndLevel,
    },
    select: { rebuyEndLevel: true },
  });

  // Read AFTER (fresh query)
  const after = await prisma.tournament.findUnique({
    where: { id },
    select: { rebuyEndLevel: true },
  });

  const response = NextResponse.json({
    _diagnostic: true,
    _timestamp: new Date().toISOString(),
    input: inputTrace,
    before: {
      rebuyEndLevel: before.rebuyEndLevel,
      type: typeof before.rebuyEndLevel,
    },
    updateResult: {
      rebuyEndLevel: updated.rebuyEndLevel,
      type: typeof updated.rebuyEndLevel,
    },
    after: {
      rebuyEndLevel: after?.rebuyEndLevel,
      type: typeof after?.rebuyEndLevel,
    },
    conclusion: {
      writeSucceeded: updated.rebuyEndLevel === body.rebuyEndLevel,
      readMatchesWrite: after?.rebuyEndLevel === updated.rebuyEndLevel,
      finalValue: after?.rebuyEndLevel,
    },
  });

  const headers = getDiagnosticHeaders();
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
