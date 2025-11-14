# Configuration de Google Cloud Text-to-Speech

## Étapes pour obtenir votre clé API Google

### 1. Créer un compte Google Cloud (si nécessaire)
- Allez sur https://console.cloud.google.com/
- Connectez-vous avec votre compte Google
- Acceptez les conditions d'utilisation

### 2. Créer un nouveau projet
- Cliquez sur le sélecteur de projet en haut de la page
- Cliquez sur "Nouveau projet"
- Nommez-le "Poker Championship" (ou autre nom de votre choix)
- Cliquez sur "Créer"

### 3. Activer l'API Cloud Text-to-Speech
- Dans le menu de navigation (☰), allez dans "APIs & Services" > "Library"
- Recherchez "Cloud Text-to-Speech API"
- Cliquez sur l'API dans les résultats
- Cliquez sur le bouton "Enable" (Activer)

### 4. Créer une clé API
- Dans le menu de navigation, allez dans "APIs & Services" > "Credentials"
- Cliquez sur "+ CREATE CREDENTIALS" en haut
- Sélectionnez "API key"
- Une clé sera générée automatiquement
- **IMPORTANT** : Copiez cette clé immédiatement !

### 5. Sécuriser votre clé API (recommandé)
- Cliquez sur "Edit API key" (l'icône crayon)
- Sous "API restrictions", sélectionnez "Restrict key"
- Cochez uniquement "Cloud Text-to-Speech API"
- Sous "Application restrictions" (optionnel pour dev local), vous pouvez :
  - Choisir "HTTP referrers" et ajouter `http://localhost:*` pour restreindre l'usage au développement local
  - Ou laisser "None" si vous voulez l'utiliser en production aussi
- Cliquez sur "Save"

### 6. Configurer la clé dans votre projet
- Ouvrez le fichier `.env` à la racine du projet
- Remplacez `YOUR_GOOGLE_API_KEY_HERE` par votre clé API :
  ```
  GOOGLE_TTS_API_KEY="AIzaSy...votre-clé-ici..."
  ```
- **ATTENTION** : Ne commitez jamais ce fichier sur Git !

### 7. Redémarrer le serveur de développement
- Arrêtez le serveur (Ctrl+C dans le terminal)
- Relancez avec `npm run dev`

## Tarification

- **Gratuit** : 1 million de caractères par mois (voix standard)
- **Gratuit** : 1 million de caractères par mois (voix Neural2)
- Au-delà : ~4€ par million de caractères

Pour un tournoi de poker avec ~20 annonces de ~50 caractères = **1000 caractères par tournoi**

Donc avec 1 million de caractères gratuits : **1000 tournois par mois gratuits** !

## Voix disponibles en français

Le code utilise actuellement `fr-FR-Neural2-B` (voix masculine naturelle).

Autres options disponibles :
- `fr-FR-Neural2-A` : Voix féminine
- `fr-FR-Neural2-C` : Voix féminine
- `fr-FR-Neural2-D` : Voix masculine
- `fr-FR-Neural2-E` : Voix féminine

Pour changer la voix, éditez le fichier `src/app/api/tts/route.ts` ligne 31.

## Fallback automatique

Si la clé API n'est pas configurée ou si l'API ne répond pas, le système utilisera automatiquement la synthèse vocale native du navigateur (voix robotisée actuelle). Aucune erreur ne bloquera l'application.

## Test

Une fois la clé configurée, lancez un tournoi et testez le changement de niveau pour entendre la nouvelle voix !
