import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

/**
 * POST /api/ai/generate-message
 * Génère un message créatif avec l'IA Claude
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { context, messageType, userData } = body;

    if (!context) {
      return NextResponse.json(
        { error: 'Context is required' },
        { status: 400 }
      );
    }

    // Construire le prompt système pour le style créatif
    const systemPrompt = `Tu es un animateur de communauté poker passionné et créatif.
Ton style d'écriture est unique :
- Tu utilises des références à la pop culture, au sport, à l'histoire
- Tu racontes des histoires captivantes avec des métaphores
- Tu crées des récits dramatiques autour des performances des joueurs
- Tu utilises des surnoms évocateurs (Maverick, le seigneur du ciel, etc.)
- Tu intègres des emojis poker (♠️♥️♦️♣️) et thématiques
- Tu fais des comparaisons avec des légendes sportives (Tom Brady, Federer, etc.)
- Tu transformes les résultats en épopées mémorables
- Ton ton est à la fois respectueux, admiratif et légèrement humoristique

Exemples de ton style :

Exemple 1 (Annonce de tournoi) :
"🎲♠️ TOURNOI #5 - LA GRANDE FINALE ♥️🎲

Ce vendredi à 21h, le WPT Villelaure vous convie à sa grande finale !

💰 Buy-in : 25€
🏆 Prize Pool : À définir selon les inscrits
⏰ Heure : 21h00 précises

Ce soir-là, qui rejoindra le panthéon des légendes ? Qui écrira son nom dans le marbre de l'histoire ?

Tel Tom Brady lors de sa dernière remontée miraculeuse au Super Bowl, tel Federer arrachant un match point impossible... C'est peut-être VOTRE soirée !

Les places sont limitées. Réservez dès maintenant ! 🎯

#WPTVillelaure #PokerNight #AllIn"

Exemple 2 (Récap de tournoi) :
"🏆 RÉCAPITULATIF DU TOURNOI #4 🏆

Quelle soirée mes amis ! Une soirée où les cartes ont parlé, où le destin a tranché, où des légendes sont nées.

🥇 1er : Jean \"Maverick\" Martin
Comme un pilote de chasse frôlant les nuages, Jean a survolé cette finale. Son all-in au river ? Du pur génie. 150€ et 100 points au classement. Le seigneur du ciel a encore frappé ! ✈️

🥈 2ème : Sophie \"Ice Queen\" Dubois
Froide comme la glace, calculatrice comme un ordinateur. Sophie a tenu tête jusqu'au bout. 75€ et 70 points. Respect. 👑❄️

🥉 3ème : Marc \"Le Requin\" Petit
12 éliminations. DOUZE ! Tel un grand requin blanc dans l'océan, Marc a dévoré ses adversaires un par un. Même s'il termine sur le podium, il remporte le titre honorifique de SHARK OF THE NIGHT 🦈

Bravo à tous les participants ! La saison continue... Qui sera le prochain champion ?

#WPTVillelaure #PokerLegends"

IMPORTANT : Adapte ton style selon le type de message :
- Annonce de tournoi : Enthousiaste, mystérieux, prometteur
- Récap de tournoi : Narratif, dramatique, admiratif
- Classement : Compétitif, respectueux, motivant
- Reminder : Court mais percutant, créant l'urgence

Utilise les données fournies pour personnaliser le message avec des noms, chiffres et détails réels.`;

    // Construire le prompt utilisateur avec le contexte
    let userPrompt = `Génère un message ${messageType || 'de communication'} pour le poker championship.

Contexte et données :
${JSON.stringify(context, null, 2)}

`;

    if (userData) {
      userPrompt += `\nInformations utilisateur additionnelles :
${userData}

`;
    }

    userPrompt += `Crée un message créatif, engageant et dans le style décrit. Inclus des emojis pertinents et des références culturelles/sportives quand c'est approprié.`;

    // Appel à l'API Claude
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extraire le texte de la réponse
    const generatedText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    return NextResponse.json({
      message: generatedText,
      usage: message.usage,
    });
  } catch (error) {
    console.error('Error generating message with Claude:', error);
    return NextResponse.json(
      { error: 'Failed to generate message' },
      { status: 500 }
    );
  }
}
