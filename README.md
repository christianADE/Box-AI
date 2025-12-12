# 🤖 Box-AI - WhatsApp Bot avec IA

Bot WhatsApp intelligent avec intégration IA (Groq/Gemini) pour des réponses automatiques personnalisées.

## ✨ Fonctionnalités

- 🔐 **Authentification sécurisée** avec JWT
- 📱 **Multi-sessions WhatsApp** avec QR Code
- 🤖 **Intégration IA multiple** : Groq, Gemini, OpenAI
- 💬 **Réponses automatiques** avec contexte de conversation
- 📊 **Historique des messages** sauvegardé en base de données
- 👥 **Multi-utilisateurs** avec configurations IA individuelles
- 🔄 **Reconnexion automatique** WhatsApp
- 🛡️ **Rate limiting** pour la sécurité

## 🚀 Installation

### Prérequis

- Node.js v16+ (recommandé v18+)
- MySQL v5.7+ ou v8.0+
- Clé API Groq ([console.groq.com](https://console.groq.com))

### Étapes

1. **Cloner le projet**
```bash
git clone https://github.com/votre-username/box-ai.git
cd box-ai
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer la base de données**
```sql
CREATE DATABASE box_ai_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'box_ai_user'@'localhost' IDENTIFIED BY 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON box_ai_db.* TO 'box_ai_user'@'localhost';
FLUSH PRIVILEGES;
```

4. **Configurer les variables d'environnement**

Créez un fichier `.env` à la racine du projet :

```env
PORT=3000

# Base de données
DB_HOST=localhost
DB_USER=box_ai_user
DB_PASSWORD=votre_mot_de_passe
DB_NAME=box_ai_db
DB_DIALECT=mysql

# Sécurité
JWT_SECRET=changez_moi_avec_une_chaine_aleatoire_longue
JWT_EXPIRES_IN=30d

# Clés API IA
GROQ_API_KEY=votre_cle_groq
GEMINI_API_KEY=votre_cle_gemini (optionnel)
OPENAI_API_KEY=votre_cle_openai (optionnel)
```

5. **Démarrer l'application**
```bash
# Développement
npm run dev

# Production
npm start
```

## 📖 Utilisation

### 1. Créer un compte

```bash
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "username": "admin",
  "email": "admin@example.com",
  "password": "motdepasse123"
}
```

### 2. Se connecter

```bash
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "motdepasse123"
}
```

Récupérez le token JWT dans la réponse.

### 3. Configurer l'IA

```bash
POST http://localhost:3000/ai/config
Authorization: Bearer VOTRE_TOKEN
Content-Type: application/json

{
  "aiProvider": "groq",
  "aiModel": "llama-3.3-70b-versatile",
  "apiKey": "votre_cle_groq",
  "autoReply": true,
  "customPrompt": "Tu es un assistant WhatsApp professionnel et amical."
}
```

### 4. Démarrer WhatsApp

```bash
POST http://localhost:3000/whatsapp/start
Authorization: Bearer VOTRE_TOKEN
```

### 5. Récupérer le QR Code

```bash
GET http://localhost:3000/whatsapp/qr
Authorization: Bearer VOTRE_TOKEN
```

Scannez le QR Code avec WhatsApp pour connecter votre compte.

## 🏗️ Architecture

```
Box-AI/
├── src/
│   ├── config/
│   │   └── database.js          # Configuration Sequelize
│   ├── models/
│   │   ├── User.js              # Modèle utilisateur
│   │   ├── WhatsAppSession.js   # Sessions WhatsApp
│   │   ├── AIConfig.js          # Configurations IA
│   │   └── Message.js           # Historique messages
│   ├── routes/
│   │   ├── authRoutes.js        # Routes authentification
│   │   ├── whatsappRoutes.js    # Routes WhatsApp
│   │   ├── aiRoutes.js          # Routes IA
│   │   └── messageRoutes.js     # Routes messages
│   ├── services/
│   │   ├── aiService.js         # Service IA (Groq/Gemini)
│   │   └── baileysService.js    # Service WhatsApp
│   └── app.js                   # Point d'entrée
├── sessions/                     # Sessions WhatsApp (gitignored)
├── .env                         # Variables d'environnement (gitignored)
├── .gitignore
├── package.json
└── README.md
```

## 🔧 Technologies

- **Backend**: Node.js, Express.js
- **Base de données**: MySQL, Sequelize ORM
- **WhatsApp**: @whiskeysockets/baileys
- **IA**: Groq SDK, Gemini API
- **Authentification**: JWT, bcrypt
- **Sécurité**: express-rate-limit, CORS

## 📚 API Endpoints

### Authentification
- `POST /auth/register` - Créer un compte
- `POST /auth/login` - Se connecter

### WhatsApp
- `POST /whatsapp/start` - Démarrer une session
- `GET /whatsapp/qr` - Récupérer le QR Code
- `GET /whatsapp/status` - Statut de la session
- `POST /whatsapp/send` - Envoyer un message
- `DELETE /whatsapp/logout` - Déconnecter

### IA
- `POST /ai/config` - Configurer l'IA
- `GET /ai/config` - Récupérer la configuration
- `PUT /ai/config` - Mettre à jour la configuration

### Messages
- `GET /messages` - Historique des messages
- `GET /messages/:sessionId` - Messages d'une session

## 🚀 Déploiement

### Railway.app (Recommandé)

1. Créez un compte sur [railway.app](https://railway.app)
2. Nouveau projet → Deploy from GitHub
3. Ajoutez une base de données MySQL
4. Configurez les variables d'environnement
5. Déployez !

### VPS (DigitalOcean, Hetzner, etc.)

```bash
# Installer PM2
npm install -g pm2

# Démarrer l'application
pm2 start src/app.js --name box-ai

# Sauvegarder la configuration
pm2 save
pm2 startup
```

Consultez le guide de déploiement complet dans la documentation.

## 🔒 Sécurité

- ✅ Mots de passe hashés avec bcrypt
- ✅ Authentification JWT
- ✅ Rate limiting (100 req/15min)
- ✅ CORS configuré
- ✅ Variables d'environnement pour les secrets
- ✅ Sessions WhatsApp isolées par utilisateur

> **⚠️ Important**: Changez le `JWT_SECRET` en production avec une chaîne aléatoire sécurisée.

## 🐛 Dépannage

### Erreur de connexion MySQL
```bash
# Vérifiez les credentials dans .env
# Testez la connexion
mysql -u box_ai_user -p box_ai_db
```

### QR Code ne s'affiche pas
```bash
# Vérifiez les logs
npm run dev
# Vérifiez que le dossier sessions/ existe
```

### L'IA ne répond pas
```bash
# Vérifiez la clé API
# Vérifiez que autoReply est à true
# Consultez les logs pour les erreurs
```

## 📄 Licence

ISC

## 👤 Auteur

Votre nom

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

---

**Fait avec ❤️ et Node.js**
