import React, { useState } from 'react';

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentMove, setCurrentMove] = useState('');
  const [stats, setStats] = useState({
    precision: 0,
    completed: 0,
    series: 0
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.pgn')) {
      setSelectedFile(file);
      // TODO: Parse PGN file
    }
  };

  const handleMoveInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentMove(event.target.value);
  };

  const handleMoveSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // TODO: Validate move
    console.log('Move submitted:', currentMove);
    setCurrentMove('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1a1d29',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        borderBottom: '2px solid #2d3142'
      }}>
        <h1 style={{
          fontSize: '3rem',
          color: '#ffd700',
          marginBottom: '0.5rem'
        }}>
          Blindfold Chess Master
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#a0a0a0' }}>
          Allena la tua visione scacchistica alla cieca
        </p>
      </div>

      <div style={{
        display: 'flex',
        maxWidth: '1200px',
        margin: '0 auto',
        gap: '2rem',
        padding: '2rem'
      }}>
        {/* Left Sidebar */}
        <div style={{ flex: '0 0 250px' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: '#ffd700', marginBottom: '1rem' }}>
              Carica File PGN
            </h2>
            <label style={{
              display: 'block',
              padding: '2rem',
              border: '2px dashed #ffd700',
              borderRadius: '8px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}>
              <input
                type="file"
                accept=".pgn"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              {selectedFile ? selectedFile.name : 'Clicca o trascina qui il file PGN'}
            </label>
          </div>

          <div>
            <h2 style={{ color: '#ffd700', marginBottom: '1rem' }}>
              Studi Caricati
            </h2>
            <div style={{
              padding: '1rem',
              backgroundColor: '#2d3142',
              borderRadius: '8px',
              minHeight: '200px'
            }}>
              {/* TODO: List loaded studies */}
              <p style={{ color: '#666' }}>Nessuno studio caricato</p>
            </div>
          </div>
        </div>

        {/* Center - Chess Board Area */}
        <div style={{ flex: '1' }}>
          <div style={{
            backgroundColor: '#2d3142',
            padding: '2rem',
            borderRadius: '12px',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Move Input */}
            <form onSubmit={handleMoveSubmit} style={{ width: '100%', maxWidth: '400px' }}>
              <input
                type="text"
                value={currentMove}
                onChange={handleMoveInput}
                placeholder="Inserisci la mossa..."
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.2rem',
                  backgroundColor: '#3d4251',
                  border: '2px solid #4d5261',
                  borderRadius: '8px',
                  color: '#ffffff',
                  marginBottom: '1.5rem',
                  textAlign: 'center'
                }}
              />
            </form>

            {/* Control Buttons */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              <button style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}>
                Nascondi/Mostra (D)
              </button>
              <button style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}>
                Elenca Pezzi (L)
              </button>
              <button style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}>
                Suggerimento (H)
              </button>
              <button style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}>
                Ricomincia (R)
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Statistics */}
        <div style={{ flex: '0 0 250px' }}>
          <h2 style={{ color: '#ffd700', marginBottom: '1rem' }}>
            Statistiche
          </h2>
          
          <div style={{
            backgroundColor: '#2d3142',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <h3 style={{ fontSize: '2rem', color: '#ffd700', marginBottom: '0.5rem' }}>
              {stats.precision}%
            </h3>
            <p style={{ color: '#a0a0a0' }}>Precisione</p>
          </div>

          <div style={{
            backgroundColor: '#2d3142',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <h3 style={{ fontSize: '2rem', color: '#ffd700', marginBottom: '0.5rem' }}>
              {stats.completed}
            </h3>
            <p style={{ color: '#a0a0a0' }}>Completati</p>
          </div>

          <div style={{
            backgroundColor: '#2d3142',
            padding: '1.5rem',
            borderRadius: '8px'
          }}>
            <h3 style={{ fontSize: '2rem', color: '#ffd700', marginBottom: '0.5rem' }}>
              {stats.series}
            </h3>
            <p style={{ color: '#a0a0a0' }}>Serie</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;