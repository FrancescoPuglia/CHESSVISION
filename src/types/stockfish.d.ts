// Type declarations for stockfish module
/* eslint-disable no-unused-vars */
declare module "stockfish" {
  interface StockfishWorker {
    postMessage(data: string): void;
    onmessage: ((event: { data: string }) => void) | null;
    terminate(): void;
  }

  interface StockfishConstructor {
    new (): StockfishWorker;
  }

  const Stockfish: StockfishConstructor;
  export default Stockfish;
}
