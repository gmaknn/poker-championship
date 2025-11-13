import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/tournament-templates - Liste tous les templates
export async function GET() {
  try {
    const templates = await prisma.tournamentTemplate.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching tournament templates:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des templates' },
      { status: 500 }
    );
  }
}

// POST /api/tournament-templates - Créer un nouveau template
export async function POST(request: NextRequest) {
  try {
    console.log('[Template API] Creating new tournament template');

    const body = await request.json();
    console.log('[Template API] Received data:', JSON.stringify(body, null, 2));

    const {
      name,
      description,
      targetDuration,
      startingChips,
      levelDuration,
      rebuyEndLevel,
      structure,
    } = body;

    // Validation
    if (!name || !structure) {
      console.log('[Template API] Validation failed: missing name or structure');
      return NextResponse.json(
        { error: 'Le nom et la structure sont requis' },
        { status: 400 }
      );
    }

    console.log('[Template API] Validation passed, creating template');

    const template = await prisma.tournamentTemplate.create({
      data: {
        name,
        description: description || null,
        targetDuration: targetDuration || null,
        startingChips: startingChips || null,
        levelDuration: levelDuration || null,
        rebuyEndLevel: rebuyEndLevel || null,
        structure,
      },
    });

    console.log('[Template API] Template created successfully:', template.id);
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('[Template API] Error creating tournament template:', error);
    console.error('[Template API] Error details:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      {
        error: 'Erreur lors de la création du template',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
