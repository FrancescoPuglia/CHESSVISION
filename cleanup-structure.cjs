const fs = require('fs');
const path = require('path');

console.log('🧹 CHESSVISION - Pulizia Struttura\n');

// Lista di cartelle/file da ELIMINARE
const toDelete = [
  '.github/worflows',  // typo
  '.github/workflows/ci.yml- CI',  // nome sbagliato
  'src/.vscode',  // .vscode deve stare nella root
  'src/core/chess/eslintrc.json',  // deve stare nella root
  'src/core/chess/gitignore',  // deve stare nella root
  'src/core/chess/prettierrc',  // deve stare nella root
  'ChessGames.test.ts'  // typo nel nome
];

// Funzione per eliminare ricorsivamente
function deleteRecursive(filePath) {
  if (fs.existsSync(filePath)) {
    if (fs.lstatSync(filePath).isDirectory()) {
      fs.readdirSync(filePath).forEach(file => {
        deleteRecursive(path.join(filePath, file));
      });
      fs.rmdirSync(filePath);
      console.log(`🗑️  Eliminata cartella: ${filePath}`);
    } else {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Eliminato file: ${filePath}`);
    }
  }
}

// Funzione per spostare file nella posizione corretta
function moveToCorrectLocation() {
  const moves = [
    // Sposta .vscode nella root se esiste in posti sbagliati
    {
      from: 'src/.vscode/.vscode/Extensions.json',
      to: '.vscode/extensions.json'
    },
    {
      from: 'src/.vscode/.vscode/settings.json', 
      to: '.vscode/settings.json'
    }
  ];

  moves.forEach(({ from, to }) => {
    if (fs.existsSync(from)) {
      const dir = path.dirname(to);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.renameSync(from, to);
      console.log(`✅ Spostato: ${from} → ${to}`);
    }
  });
}

// Funzione per creare la struttura corretta di .github/workflows
function fixGitHubWorkflows() {
  const correctPath = '.github/workflows';
  
  // Crea la struttura corretta
  if (!fs.existsSync(correctPath)) {
    fs.mkdirSync(correctPath, { recursive: true });
    console.log(`✅ Creata cartella: ${correctPath}`);
  }

  // Se esiste un ci.yml da qualche parte, spostalo
  const ciYmlContent = `name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: 18
        
    - run: npm ci
    - run: npm run lint
    - run: npm run type-check
    - run: npm test
    - run: npm run build`;

  fs.writeFileSync(path.join(correctPath, 'ci.yml'), ciYmlContent);
  console.log(`✅ Creato: ${correctPath}/ci.yml`);
}

// Esecuzione
console.log('1️⃣ Eliminazione strutture sbagliate...\n');
toDelete.forEach(deleteRecursive);

console.log('\n2️⃣ Spostamento file nelle posizioni corrette...\n');
moveToCorrectLocation();

console.log('\n3️⃣ Creazione struttura GitHub corretta...\n');
fixGitHubWorkflows();

console.log('\n4️⃣ Verifica finale...\n');

// Mostra la struttura finale
function showStructure(dir, indent = '') {
  const items = fs.readdirSync(dir).filter(item => !item.includes('node_modules'));
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const isDir = fs.lstatSync(fullPath).isDirectory();
    
    if (isDir && ['src', '.github', '.vscode', 'tests', 'docs', 'public'].includes(item)) {
      console.log(indent + '📁 ' + item + '/');
      if (indent.length < 4) {  // Limita la profondità
        showStructure(fullPath, indent + '  ');
      }
    }
  });
}

showStructure('.');

console.log('\n✅ Pulizia completata!');
console.log('\nOra dovresti avere una sola cartella src nella root!');
console.log('\nProssimi comandi:');
console.log('1. git add .');
console.log('2. git commit -m "fix: clean up duplicate src folders and fix structure"');
console.log('3. git push origin main');
console.log('4. npm run dev');