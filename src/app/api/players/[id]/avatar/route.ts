import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import { existsSync } from 'fs';
import { requirePermission } from '@/lib/auth-helpers';
import { PERMISSIONS } from '@/lib/permissions';

type Params = Promise<{ id: string }>;

const AVATAR_SIZE = 256;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Get the avatars directory path.
 * In production (Fly.io), use /data/avatars for persistence.
 * In development, use public/avatars.
 */
function getAvatarsDir(): string {
  if (process.env.NODE_ENV === 'production') {
    return '/data/avatars';
  }
  return join(process.cwd(), 'public', 'avatars');
}

/**
 * POST /api/players/[id]/avatar
 * Upload and process a custom avatar for a player
 */
export async function POST(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    // Vérifier l'authentification et la permission EDIT_PLAYER (l'upload d'avatar est une édition)
    const permResult = await requirePermission(request, PERMISSIONS.EDIT_PLAYER);
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    const params = await segmentData.params;
    const playerId = params.id;

    // Get form data
    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé. Utilisez JPG, PNG ou WebP.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux. Maximum 5MB.' },
        { status: 400 }
      );
    }

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Process image with sharp: resize, crop to square, optimize
    const processedImage = await sharp(buffer)
      .resize(AVATAR_SIZE, AVATAR_SIZE, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Create avatars directory if it doesn't exist
    const avatarsDir = getAvatarsDir();
    if (!existsSync(avatarsDir)) {
      await mkdir(avatarsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${playerId}-${timestamp}.jpg`;
    const filepath = join(avatarsDir, filename);

    // Save file
    await writeFile(filepath, processedImage);

    // Return avatar URL - use API route in production for serving from /data
    // In development, serve directly from /public/avatars
    const avatarUrl = process.env.NODE_ENV === 'production'
      ? `/api/avatars/${filename}`
      : `/avatars/${filename}`;

    return NextResponse.json({
      avatarUrl,
      message: 'Avatar uploadé avec succès',
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload de l\'avatar' },
      { status: 500 }
    );
  }
}
