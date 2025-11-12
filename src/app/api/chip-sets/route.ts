import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/chip-sets - Liste toutes les mallettes
export async function GET() {
  try {
    const chipSets = await prisma.chipSet.findMany({
      include: {
        denominations: {
          orderBy: {
            value: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(chipSets);
  } catch (error) {
    console.error('Error fetching chip sets:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des mallettes' },
      { status: 500 }
    );
  }
}

// POST /api/chip-sets - Créer une nouvelle mallette
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, isActive, denominations } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Le nom est requis' },
        { status: 400 }
      );
    }

    const chipSet = await prisma.chipSet.create({
      data: {
        name,
        description,
        isActive: isActive ?? true,
        denominations: denominations
          ? {
              create: denominations.map((d: any) => ({
                value: d.value,
                quantity: d.quantity,
                color: d.color,
                colorSecondary: d.colorSecondary,
              })),
            }
          : undefined,
      },
      include: {
        denominations: true,
      },
    });

    return NextResponse.json(chipSet, { status: 201 });
  } catch (error) {
    console.error('Error creating chip set:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la mallette' },
      { status: 500 }
    );
  }
}
