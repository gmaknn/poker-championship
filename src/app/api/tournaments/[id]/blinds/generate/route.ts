import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  generateBlindStructure,
  PRESET_STRUCTURES,
  calculateBlindStats,
  validateBlindStructure,
} from '@/lib/blindGenerator';

const generateSchema = z.object({
  preset: z.enum(['turbo', 'standard', 'deep']).optional(),
  custom: z
    .object({
      startingChips: z.number().int().positive(),
      targetDuration: z.number().int().positive(),
      levelDuration: z.number().int().positive(),
      startingBB: z.number().int().positive().optional(),
      anteStartLevel: z.number().int().positive().optional(),
    })
    .optional(),
});

// POST - Générer une structure de blinds
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = generateSchema.parse(body);

    // Récupérer le tournoi
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Générer la structure
    let levels;
    if (validatedData.preset) {
      // Utiliser un preset
      const presetFn = PRESET_STRUCTURES[validatedData.preset];
      levels = presetFn(tournament.startingChips);
    } else if (validatedData.custom) {
      // Générer une structure personnalisée
      levels = generateBlindStructure(validatedData.custom);
    } else {
      // Par défaut, utiliser les paramètres du tournoi
      levels = generateBlindStructure({
        startingChips: tournament.startingChips,
        targetDuration: tournament.targetDuration,
        levelDuration: tournament.levelDuration,
      });
    }

    // Valider la structure
    const validation = validateBlindStructure(levels);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid blind structure', details: validation.errors },
        { status: 400 }
      );
    }

    // Calculer les stats
    const stats = calculateBlindStats(levels, tournament.startingChips);

    return NextResponse.json({
      levels,
      stats,
      validation,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error generating blind structure:', error);
    return NextResponse.json(
      { error: 'Failed to generate blind structure' },
      { status: 500 }
    );
  }
}
