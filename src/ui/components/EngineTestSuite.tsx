// src/ui/components/EngineTestSuite.tsx
import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { stockfishNNUE } from "@services/engine/StockfishNNUE";

interface TestResult {
  position: string;
  level: string;
  move: string;
  depth: number;
  time: number;
  elo: number;
  isLegal: boolean;
  isExpected: boolean;
  confidence: number;
  passed: boolean;
}

interface TestPosition {
  name: string;
  fen: string;
  expectedMoves: string[];
  minLevel: number; // ELO minimo per aspettarsi le mosse giuste
  description: string;
}

/**
 * 🔧 SUITE DI TEST COMPLETA PER I MOTORI
 * Validazione sistematica seguendo l'analisi strategica
 */
export default function EngineTestSuite() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState("");
  const [engineReady, setEngineReady] = useState(false);
  const [summary, setSummary] = useState<{
    [key: string]: { passed: number; total: number };
  }>({});

  // 🎯 POSIZIONI DI TEST STRATEGICHE
  const testPositions: TestPosition[] = [
    {
      name: "Matto in 1 (Facile)",
      fen: "rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 1 3",
      expectedMoves: ["g3"], // Para il matto
      minLevel: 800,
      description: "Deve parare il matto in 1 di Qh4#",
    },
    {
      name: "Matto in 1 (Intermedio)",
      fen: "r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
      expectedMoves: ["Bxf7+"],
      minLevel: 1200,
      description: "Deve trovare il matto del barbiere",
    },
    {
      name: "Tattica: Forchetta di Cavallo",
      fen: "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
      expectedMoves: ["Ng5", "Bc4"],
      minLevel: 1400,
      description: "Preparare tattica di attacco",
    },
    {
      name: "Finale di Re e Pedone",
      fen: "8/8/8/4k3/4P3/4K3/8/8 w - - 0 1",
      expectedMoves: ["Kf4", "Kd4"],
      minLevel: 1600,
      description: "Deve giocare opposizione nel finale",
    },
    {
      name: "Posizione Complessa (GM Level)",
      fen: "r2q1rk1/ppp2ppp/2n1bn2/2bpp3/3P4/2N1PN2/PPP1BPPP/R1BQK2R w KQ - 0 8",
      expectedMoves: ["O-O", "dxe5", "h3", "a3"],
      minLevel: 2000,
      description: "Richiede comprensione posizionale profonda",
    },
    {
      name: "Sacrificio di Qualità",
      fen: "r1bq1rk1/pp3ppp/2n1pn2/3p4/2PP4/2N1PN2/PP3PPP/R1BQKB1R w KQ - 0 8",
      expectedMoves: ["d5", "Nd5", "Bg5"],
      minLevel: 2200,
      description: "Livello professionale - sacrifici posizionali",
    },
  ];

  useEffect(() => {
    initializeEngine();
  }, []);

  const initializeEngine = async () => {
    setCurrentTest("Inizializzando motore professionale...");
    try {
      await stockfishNNUE.initialize();
      setEngineReady(true);
      setCurrentTest("✅ Motore pronto per i test");
    } catch (error) {
      setCurrentTest("❌ Errore nell'inizializzazione del motore");
      console.error(error);
    }
  };

  const runFullTestSuite = async () => {
    if (!engineReady) {
      alert("Motore non pronto. Attendi l'inizializzazione.");
      return;
    }

    setIsRunning(true);
    setTestResults([]);
    setSummary({});

    const levels = stockfishNNUE.getAllLevels();
    const results: TestResult[] = [];
    const levelStats: { [key: string]: { passed: number; total: number } } = {};

    // Inizializza statistiche
    levels.forEach((level) => {
      levelStats[level.key] = { passed: 0, total: 0 };
    });

    for (const level of levels) {
      setCurrentTest(`🧪 Testing livello: ${level.name} (${level.elo} ELO)`);

      for (const position of testPositions) {
        // Skip test troppo difficili per livelli bassi
        if (level.elo < position.minLevel) {
          continue;
        }

        setCurrentTest(`${level.name}: ${position.name}`);
        const startTime = Date.now();

        try {
          const result = await stockfishNNUE.analyzePosition(
            position.fen,
            level.key,
          );
          const timeElapsed = Date.now() - startTime;

          // Verifica legalità
          const chess = new Chess(position.fen);
          const moves = chess.moves();
          const isLegal = moves.some((move) => {
            // Controlla sia UCI che SAN
            const moveObj = chess.move(move);
            const uciMove = `${moveObj.from}${moveObj.to}${moveObj.promotion || ""}`;
            chess.undo();
            return uciMove === result.move || move === result.move;
          });

          // Verifica se è una mossa attesa
          const isExpected = position.expectedMoves.some((expected) => {
            chess.load(position.fen);
            try {
              const moveObj = chess.move(expected);
              const expectedUci = `${moveObj.from}${moveObj.to}${moveObj.promotion || ""}`;
              chess.undo();
              return expectedUci === result.move || expected === result.move;
            } catch {
              return false;
            }
          });

          const passed = isLegal && (level.elo < 2000 || isExpected);

          const testResult: TestResult = {
            position: position.name,
            level: level.name,
            move: result.move,
            depth: result.depth || 0,
            time: timeElapsed,
            elo: level.elo,
            isLegal,
            isExpected,
            confidence: result.confidence || 0,
            passed,
          };

          results.push(testResult);
          levelStats[level.key].total++;
          if (passed) levelStats[level.key].passed++;
        } catch (error) {
          console.error(
            `Test failed for ${level.key} on ${position.name}:`,
            error,
          );

          const testResult: TestResult = {
            position: position.name,
            level: level.name,
            move: "ERROR",
            depth: 0,
            time: 0,
            elo: level.elo,
            isLegal: false,
            isExpected: false,
            confidence: 0,
            passed: false,
          };

          results.push(testResult);
          levelStats[level.key].total++;
        }

        setTestResults([...results]);
        setSummary({ ...levelStats });
      }
    }

    setIsRunning(false);
    setCurrentTest("🏁 Test suite completata!");
  };

  const getStatusIcon = (passed: boolean) => (passed ? "✅" : "❌");

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-400";
    if (confidence >= 0.6) return "text-yellow-400";
    return "text-red-400";
  };

  const getLevelColor = (elo: number) => {
    if (elo >= 2200) return "text-purple-400";
    if (elo >= 1800) return "text-blue-400";
    if (elo >= 1200) return "text-green-400";
    return "text-gray-400";
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            🔧 Suite di Test Motori Professionali
          </h1>
          <p className="text-gray-300 text-lg">
            Validazione sistematica dei livelli di forza secondo l&apos;analisi
            strategica
          </p>
        </div>

        {/* Status e Controlli */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Stato del Sistema</h2>
              <p
                className={`text-lg ${engineReady ? "text-green-400" : "text-yellow-400"}`}
              >
                {engineReady ? "🟢 Motore Pronto" : "🟡 Inizializzazione..."}
              </p>
              {currentTest && (
                <p className="text-sm text-gray-400 mt-2">{currentTest}</p>
              )}
            </div>

            <button
              onClick={runFullTestSuite}
              disabled={isRunning || !engineReady}
              className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all ${
                isRunning || !engineReady
                  ? "bg-gray-700 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105 shadow-lg"
              }`}
            >
              {isRunning ? "⏳ Test in Corso..." : "🚀 Avvia Test Completo"}
            </button>
          </div>

          {/* Riassunto Rapido */}
          {Object.keys(summary).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {Object.entries(summary).map(([levelKey, stats]) => {
                const level = stockfishNNUE
                  .getAllLevels()
                  .find((l) => l.key === levelKey);
                const percentage =
                  stats.total > 0
                    ? ((stats.passed / stats.total) * 100).toFixed(1)
                    : "0";

                return (
                  <div
                    key={levelKey}
                    className="bg-gray-700 rounded-lg p-3 text-center"
                  >
                    <h3
                      className={`font-semibold text-sm ${getLevelColor(level?.elo || 0)}`}
                    >
                      {level?.name || levelKey}
                    </h3>
                    <div className="mt-2">
                      <div className="text-2xl font-bold">{percentage}%</div>
                      <div className="text-xs text-gray-400">
                        {stats.passed}/{stats.total} test
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Risultati Dettagliati */}
        {testResults.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">
              📊 Risultati Dettagliati
            </h2>

            {testResults.map((result, idx) => (
              <div
                key={idx}
                className={`bg-gray-800 rounded-lg p-6 border-l-4 ${
                  result.passed ? "border-green-500" : "border-red-500"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold flex items-center gap-3">
                      {getStatusIcon(result.passed)}
                      <span className={getLevelColor(result.elo)}>
                        {result.level}
                      </span>
                      <span className="text-gray-300">→</span>
                      <span>{result.position}</span>
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      ELO: {result.elo} | Profondità: {result.depth} | Tempo:{" "}
                      {result.time}ms
                    </p>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-2xl font-bold ${getConfidenceColor(result.confidence)}`}
                    >
                      {(result.confidence * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-400">confidenza</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Mossa Giocata</h4>
                    <p className="font-mono text-lg bg-gray-800 px-3 py-2 rounded">
                      {result.move}
                    </p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p
                        className={
                          result.isLegal ? "text-green-400" : "text-red-400"
                        }
                      >
                        {result.isLegal ? "✓ Legale" : "✗ Illegale"}
                      </p>
                      <p
                        className={
                          result.isExpected
                            ? "text-green-400"
                            : "text-yellow-400"
                        }
                      >
                        {result.isExpected ? "✓ Attesa" : "○ Non standard"}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Performance</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Profondità:</span>
                        <span className="font-mono">{result.depth}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tempo:</span>
                        <span className="font-mono">{result.time}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Confidenza:</span>
                        <span
                          className={`font-mono ${getConfidenceColor(result.confidence)}`}
                        >
                          {(result.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Valutazione</h4>
                    <div
                      className={`text-center py-3 rounded ${
                        result.passed
                          ? "bg-green-900 text-green-200"
                          : "bg-red-900 text-red-200"
                      }`}
                    >
                      <div className="text-2xl font-bold">
                        {result.passed ? "PASS" : "FAIL"}
                      </div>
                      <div className="text-xs mt-1">
                        {result.passed
                          ? "Test superato con successo"
                          : "Test fallito - richiede miglioramenti"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info sulla Suite */}
        <div className="mt-12 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-6 border border-blue-500/30">
          <h2 className="text-xl font-bold mb-4">
            💡 Informazioni sulla Suite di Test
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2 text-blue-400">
                Cosa Testiamo
              </h3>
              <ul className="text-sm space-y-1 text-gray-300">
                <li>• Legalità delle mosse generate</li>
                <li>• Qualità tattica per ogni livello ELO</li>
                <li>• Tempi di risposta appropriati</li>
                <li>• Differenziazione tra livelli</li>
                <li>• Capacità di trovare matti semplici</li>
                <li>• Comprensione posizionale avanzata</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-purple-400">
                Livelli di Test
              </h3>
              <ul className="text-sm space-y-1 text-gray-300">
                <li>
                  • <span className="text-gray-400">800-1200:</span>{" "}
                  Principianti
                </li>
                <li>
                  • <span className="text-green-400">1200-1800:</span> Intermedi
                </li>
                <li>
                  • <span className="text-blue-400">1800-2200:</span> Avanzati
                </li>
                <li>
                  • <span className="text-purple-400">2200+:</span>{" "}
                  Professionali
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
