import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getCurrentPlayer } from '@/lib/auth-helpers';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

const settingsSchema = z.object({
  championshipName: z.string().min(1, 'Le nom du championnat est requis'),
  clubName: z.string().min(1, 'Le nom du club est requis'),
  clubLogo: z.string().optional(),
  defaultBuyIn: z.number().positive('Le buy-in doit être positif'),
  defaultStartingChips: z.number().int().positive('Les jetons de départ doivent être positifs'),
  defaultLevelDuration: z.number().int().positive('La durée des niveaux doit être positive'),
  defaultTargetDuration: z.number().int().positive('La durée cible doit être positive'),
  enableEmailNotifications: z.boolean(),
  enableSmsNotifications: z.boolean(),
  theme: z.enum(['light', 'dark']),
  language: z.enum(['fr', 'en']),
});

// GET - Récupérer les paramètres (ou créer avec valeurs par défaut si inexistant)
export async function GET() {
  try {
    let settings = await prisma.settings.findFirst();

    // Si aucun paramètre n'existe, en créer un avec les valeurs par défaut
    if (!settings) {
      settings = await prisma.settings.create({
        data: {}
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour les paramètres
export async function PUT(request: NextRequest) {
  try {
    // Vérifier les permissions - seuls les ADMIN peuvent modifier les paramètres
    const currentPlayer = await getCurrentPlayer(request);

    if (!currentPlayer || !hasPermission(currentPlayer.role, PERMISSIONS.EDIT_SETTINGS)) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de modifier les paramètres' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Valider les données
    const validatedData = settingsSchema.parse(body);

    // Récupérer ou créer les paramètres
    let settings = await prisma.settings.findFirst();

    if (!settings) {
      settings = await prisma.settings.create({
        data: validatedData
      });
    } else {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: validatedData
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
