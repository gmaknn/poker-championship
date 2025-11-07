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

export async function GET() {
  try {
    const players = await prisma.player.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { nickname: 'asc' },
      include: {
        _count: {
          select: {
            tournamentPlayers: true,
            eliminations: true,
          },
        },
      },
    });

    return NextResponse.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = playerSchema.parse(body);

    const player = await prisma.player.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        nickname: validatedData.nickname,
        email: validatedData.email || null,
        avatar: validatedData.avatar,
      },
    });

    return NextResponse.json(player, { status: 201 });
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

    console.error('Error creating player:', error);
    return NextResponse.json(
      { error: 'Failed to create player' },
      { status: 500 }
    );
  }
}
