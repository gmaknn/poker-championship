import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = Promise<{ id: string }>;

// GET /api/tournament-templates/[id] - Récupérer un template
export async function GET(request: NextRequest, segmentData: { params: Params }) {
  try {
    const params = await segmentData.params;
    const template = await prisma.tournamentTemplate.findUnique({
      where: { id: params.id },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error fetching tournament template:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du template' },
      { status: 500 }
    );
  }
}

// PUT /api/tournament-templates/[id] - Mettre à jour un template
export async function PUT(request: NextRequest, segmentData: { params: Params }) {
  try {
    const params = await segmentData.params;
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

    const template = await prisma.tournamentTemplate.update({
      where: { id: params.id },
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

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error updating tournament template:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du template' },
      { status: 500 }
    );
  }
}

// DELETE /api/tournament-templates/[id] - Supprimer un template
export async function DELETE(request: NextRequest, segmentData: { params: Params }) {
  try {
    const params = await segmentData.params;

    await prisma.tournamentTemplate.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tournament template:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du template' },
      { status: 500 }
    );
  }
}
