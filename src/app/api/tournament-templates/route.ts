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
    const body = await request.json();
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
      return NextResponse.json(
        { error: 'Le nom et la structure sont requis' },
        { status: 400 }
      );
    }

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

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating tournament template:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du template' },
      { status: 500 }
    );
  }
}
