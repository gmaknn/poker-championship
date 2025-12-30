import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-helpers';
import { PERMISSIONS } from '@/lib/permissions';

type Params = Promise<{ id: string }>;

// GET /api/chip-sets/[id]/denominations - Liste les dénominations
export async function GET(request: NextRequest, segmentData: { params: Params }) {
  try {
    const params = await segmentData.params;
    const denominations = await prisma.chipSetDenomination.findMany({
      where: { chipSetId: params.id },
      orderBy: {
        value: 'asc',
      },
    });

    return NextResponse.json(denominations);
  } catch (error) {
    console.error('Error fetching denominations:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des dénominations' },
      { status: 500 }
    );
  }
}

// POST /api/chip-sets/[id]/denominations - Ajouter une dénomination
export async function POST(request: NextRequest, segmentData: { params: Params }) {
  try {
    // Vérifier les permissions
    const permResult = await requirePermission(request, PERMISSIONS.EDIT_CHIPSET);
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    const params = await segmentData.params;
    const body = await request.json();
    const { value, quantity, color, colorSecondary } = body;

    if (!value || !quantity || !color) {
      return NextResponse.json(
        { error: 'Valeur, quantité et couleur sont requis' },
        { status: 400 }
      );
    }

    const denomination = await prisma.chipSetDenomination.create({
      data: {
        chipSetId: params.id,
        value,
        quantity,
        color,
        colorSecondary,
      },
    });

    return NextResponse.json(denomination, { status: 201 });
  } catch (error) {
    console.error('Error creating denomination:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la dénomination' },
      { status: 500 }
    );
  }
}
