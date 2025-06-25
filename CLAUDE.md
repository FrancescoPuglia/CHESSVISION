# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Development
- `npm run dev` - Start development server (Vite) on port 5173
- `npm run build` - Production build (TypeScript compilation + Vite build)
- `npm run preview` - Preview production build on port 4173

### Code Quality
- `npm run lint` - ESLint with TypeScript rules
- `npm run format` - Format code with Prettier
- `npm run type-check` - TypeScript type checking without emit

### Testing
- `npm test` - Run unit tests with Vitest
- `npm run test:ui` - Interactive test UI
- `npm run test:coverage` - Generate coverage report
- `npm run test:e2e` - Playwright end-to-end tests

Coverage thresholds: 80% lines/functions/statements, 70% branches

## Project Architecture

### Core Structure
This is a React + TypeScript chess training application using a layered architecture:

- **Core Layer** (`src/core/`): Pure business logic, framework-agnostic
  - `chess/` - Chess.js wrapper with type-safe API
  - `pgn/` - PGN parsing with support for comments and variations
  - `stats/` - Statistics tracking with Zod validation
  - `study/` - Study management engine

- **Services Layer** (`src/services/`): Side effects and external integrations
  - `storage/` - IndexedDB persistence with migration support
  - `speech/` - Web Speech API integration (Phase 1)
  - `logger/` - Logging system

- **UI Layer** (`src/ui/`): React components and presentation
  - `components/` - Reusable UI components
  - `pages/` - Application pages
  - `hooks/` - Custom React hooks

### Key Technologies
- **Chess Logic**: chess.js library wrapped in type-safe ChessGame class
- **UI Rendering**: Chessground for interactive chess board
- **Storage**: IndexedDB via idb-keyval with structured data migrations
- **Validation**: Zod schemas for runtime type checking
- **Build**: Vite with manual chunk splitting for optimal loading

### Path Aliases
The project uses TypeScript path aliases:
- `@/*` → `./src/*`
- `@core/*` → `./src/core/*`
- `@services/*` → `./src/services/*`
- `@ui/*` → `./src/ui/*`
- `@stores/*` → `./src/stores/*`
- `@utils/*` → `./src/utils/*`
- `@types/*` → `./src/types/*`

### Application Features
- Blindfold chess training with PGN study support
- Voice control integration (planned)
- Spaced repetition system with Anki-style flashcards (planned)
- Statistics tracking with streak management
- Offline-first design with IndexedDB persistence
- Multi-language support (Italian/English)

### Development Notes
- Strict TypeScript configuration with noUnusedLocals/Parameters
- ESLint + Prettier for code quality
- Husky + lint-staged for pre-commit hooks
- Bundle analysis with rollup-plugin-visualizer
- Coverage reporting with v8 provider