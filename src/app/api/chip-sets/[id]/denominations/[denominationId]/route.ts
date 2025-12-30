import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-helpers';
import { PERMISSIONS } from '@/lib/permissions';

type Params = Promise<{ id: string; denominationId: string }>;

// PUT /api/chip-sets/[id]/denominations/[denominationId] - Mettre à jour
export async function PUT(request: NextRequest, segmentData: { params: Params }) {
  try {
    // Vérifier les permissions
    const permResult = await requirePermission(request, PERMISSIONS.EDIT_CHIPSET);
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    const params = await segmentData.params;
    const body = await request.json();
    const { value, quantity, color, colorSecondary } = body;

    const denomination = await prisma.chipSetDenomination.update({
      where: { id: params.denominationId },
      data: {
        value,
        quantity,
        color,
        colorSecondary,
      },
    });

    return NextResponse.json(denomination);
  } catch (error) {
    console.error('Error updating denomination:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la dénomination' },
      { status: 500 }
    );
  }
}

// DELETE /api/chip-sets/[id]/denominations/[denominationId] - Supprimer
export async function DELETE(request: NextRequest, segmentData: { params: Params }) {
  try {
    // Vérifier les permissions
    const permResult = await requirePermission(request, PERMISSIONS.EDIT_CHIPSET);
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    const params = await segmentData.params;

    await prisma.chipSetDenomination.delete({
      where: { id: params.denominationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting denomination:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la dénomination' },
      { status: 500 }
    );
  }
}
