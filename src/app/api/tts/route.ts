import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route for Google Cloud Text-to-Speech
 * Generates high-quality speech audio from text
 */
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_TTS_API_KEY;

    if (!apiKey || apiKey === 'YOUR_GOOGLE_API_KEY_HERE') {
      // Fallback: return error so client can use native speech synthesis
      return NextResponse.json(
        { error: 'Google TTS API key not configured', fallbackToNative: true },
        { status: 503 }
      );
    }

    // Call Google Cloud Text-to-Speech API
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: 'fr-FR',
            name: 'fr-FR-Neural2-A', // Female voice, natural and expressive
            // Other options:
            // 'fr-FR-Neural2-B' - Male
            // 'fr-FR-Neural2-C' - Female
            // 'fr-FR-Neural2-D' - Male
            // 'fr-FR-Neural2-E' - Female
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 0.95, // Slightly slower for clarity
            pitch: 0.0, // Normal pitch
            volumeGainDb: 0.0, // Normal volume
            effectsProfileId: ['headphone-class-device'], // Optimized for headphones/speakers
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Google TTS API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate speech', fallbackToNative: true },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return the audio content as base64
    return NextResponse.json({
      audioContent: data.audioContent, // Base64-encoded MP3
      mimeType: 'audio/mp3',
    });
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', fallbackToNative: true },
      { status: 500 }
    );
  }
}
