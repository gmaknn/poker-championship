import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const playerSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  nickname: z.string().min(1, 'Le pseudo est requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  avatar: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        tournamentPlayers: {
          include: {
            tournament: true,
          },
          orderBy: {
            tournament: {
              date: 'desc',
            },
          },
        },
        _count: {
          select: {
            tournamentPlayers: true,
            eliminations: true,
          },
        },
      },
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    return NextResponse.json(player);
  } catch (error) {
    console.error('Error fetching player:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = playerSchema.parse(body);

    const player = await prisma.player.update({
      where: { id },
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        nickname: validatedData.nickname,
        email: validatedData.email || null,
        avatar: validatedData.avatar,
      },
    });

    return NextResponse.json(player);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ce pseudo est déjà utilisé' },
        { status: 409 }
      );
    }

    console.error('Error updating player:', error);
    return NextResponse.json(
      { error: 'Failed to update player' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Archive instead of delete to preserve history
    const player = await prisma.player.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    return NextResponse.json(player);
  } catch (error) {
    console.error('Error archiving player:', error);
    return NextResponse.json(
      { error: 'Failed to archive player' },
      { status: 500 }
    );
  }
}
