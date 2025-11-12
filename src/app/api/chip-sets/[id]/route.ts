import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = Promise<{ id: string }>;

// GET /api/chip-sets/[id] - Détails d'une mallette
export async function GET(request: NextRequest, segmentData: { params: Params }) {
  try {
    const params = await segmentData.params;
    const chipSet = await prisma.chipSet.findUnique({
      where: { id: params.id },
      include: {
        denominations: {
          orderBy: {
            value: 'asc',
          },
        },
      },
    });

    if (!chipSet) {
      return NextResponse.json(
        { error: 'Mallette non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json(chipSet);
  } catch (error) {
    console.error('Error fetching chip set:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la mallette' },
      { status: 500 }
    );
  }
}

// PUT /api/chip-sets/[id] - Mettre à jour une mallette
export async function PUT(request: NextRequest, segmentData: { params: Params }) {
  try {
    const params = await segmentData.params;
    const body = await request.json();
    const { name, description, isActive } = body;

    // Si on active cette mallette, désactiver toutes les autres
    if (isActive === true) {
      await prisma.chipSet.updateMany({
        where: {
          id: { not: params.id },
        },
        data: {
          isActive: false,
        },
      });
    }

    const chipSet = await prisma.chipSet.update({
      where: { id: params.id },
      data: {
        name,
        description,
        isActive,
      },
      include: {
        denominations: true,
      },
    });

    return NextResponse.json(chipSet);
  } catch (error) {
    console.error('Error updating chip set:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la mallette' },
      { status: 500 }
    );
  }
}

// DELETE /api/chip-sets/[id] - Supprimer une mallette
export async function DELETE(request: NextRequest, segmentData: { params: Params }) {
  try {
    const params = await segmentData.params;

    await prisma.chipSet.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chip set:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la mallette' },
      { status: 500 }
    );
  }
}
