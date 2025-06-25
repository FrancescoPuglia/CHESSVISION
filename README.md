🎯 ChessVision
Allena la tua visione scacchistica alla cieca con un'applicazione moderna e performante
🚀 Features
♟️ Allenamento alla cieca - Risolvi studi senza vedere la scacchiera
🎤 Controllo vocale - Comandi e mosse tramite voce (FASE 1)
⏱️ Timer configurabile - Pressione temporale per simulare partite reali
📚 Parser PGN avanzato - Supporto completo per commenti, NAG e varianti
🧠 Modalità Anki - Ripetizione spaziata per memorizzare pattern (FASE 3)
📊 Analytics dettagliate - Traccia i tuoi progressi nel tempo
🌐 Multilingua - Italiano e Inglese
💾 Offline-first - Funziona anche senza connessione
📋 Prerequisiti

Node.js 20+
npm 9+ o pnpm 8+
Git

🛠️ Installazione
bash# Clona il repository
git clone https://github.com/FrancescoPuglia/CHESSVISION.git
cd CHESSVISION

# Installa le dipendenze
npm install

# Avvia in modalità sviluppo
npm run dev
📁 Struttura del Progetto
src/
├── core/                    # Logica di business (pura, testabile)
│   ├── chess/              # Wrapper chess.js e tipi
│   ├── pgn/                # Parser PGN completo
│   ├── study/              # Engine per gestire studi
│   └── stats/              # Gestione statistiche con Zod
├── services/               # Servizi e side-effects
│   ├── storage/            # Persistenza con IndexedDB
│   ├── speech/             # Web Speech API (FASE 1)
│   └── logger/             # Sistema di logging
├── ui/                     # Componenti React
│   ├── components/         # Componenti riutilizzabili
│   ├── pages/              # Pagine dell'app
│   └── hooks/              # Custom React hooks
└── tests/                  # Test suite
    ├── unit/               # Test unitari (Vitest)
    └── e2e/                # Test E2E (Playwright)
🧪 Testing
bash# Unit tests
npm run test

# Test con UI interattiva
npm run test:ui

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e
Coverage Minima

Core modules: 80% linee, 80% funzioni
UI components: 50% linee
Overall: 70% statements

🔧 Scripts Disponibili
ScriptDescrizionenpm run devAvvia server di sviluppo con HMRnpm run buildBuild di produzionenpm run lintControllo qualità codicenpm run formatFormatta il codicenpm run type-checkVerifica tipi TypeScriptnpm run testEsegue test unitarinpm run previewPreview build di produzione
🏗️ Architettura
Principi

Separation of Concerns - Logica separata dalla UI
Type Safety - TypeScript strict mode
Testability - Dependency injection e pure functions
Performance - Lazy loading e code splitting

Pattern Utilizzati

Repository Pattern - Per l'accesso ai dati
Observer Pattern - Per la gestione dello stato
Strategy Pattern - Per i diversi modi di allenamento
Factory Pattern - Per la creazione di oggetti complessi

📈 Roadmap
✅ FASE 0 - Fondamenta (Completata)

✅ Setup TypeScript + Vite + React
✅ Architettura modulare
✅ Testing framework
✅ CI/CD pipeline

🚧 FASE 1 - Core Features

⏳ Web Speech API integration
⏳ Timer con countdown vocale
⏳ Parser PGN completo (commenti, varianti)
⏳ Stockfish WASM per suggerimenti

📅 FASE 2 - Studio Engine

⏳ Gestione varianti multiple
⏳ Hint progressivi
⏳ Modalità Memory Chess

📅 FASE 3 - Flashcards & SRS

⏳ Algoritmo SM-2
⏳ Calendario streak
⏳ Import/Export deck

📅 FASE 4 - Backend

⏳ Autenticazione Firebase
⏳ Sync multi-dispositivo
⏳ Leaderboard globale

🤝 Contribuire

Fork il progetto
Crea un branch (git checkout -b feature/AmazingFeature)
Commit con Conventional Commits (git commit -m 'feat: add amazing feature')
Push al branch (git push origin feature/AmazingFeature)
Apri una Pull Request

Convenzioni

Commits: Usa Conventional Commits
Branch: feature/, fix/, docs/*
Code Style: Prettier + ESLint
Test: Minimo 80% coverage per nuove features

📄 Licenza
Distribuito sotto licenza MIT. Vedi LICENSE per maggiori informazioni.
👨‍💻 Autore
Francesco Puglia

GitHub: @FrancescoPuglia
LinkedIn: Francesco Puglia

🙏 Ringraziamenti

chess.js - Logica scacchistica
Chessground - UI scacchiera
Vite - Build tool
Vitest - Testing framework


Creato con ❤️ da Francesco Puglia © 2025
