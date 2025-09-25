const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const csvParser = require('csv-parser');

// Load environment variables
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Data directory created:', dataDir);
  } catch (err) {
    console.warn('Could not create data directory, using root directory:', err);
  }
}

// Initialize SQLite database
const dbPath = process.env.DATABASE_PATH || (fs.existsSync(dataDir)
  ? path.join(dataDir, 'guests.db')
  : path.join(__dirname, 'guests.db'));

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err);
  } else {
    console.log(`Connected to SQLite database at ${dbPath}`);
  }
});

// Create guests table if it doesn't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      cpf TEXT,
      telefone TEXT,
      empresa TEXT,
      observacoes TEXT,
      confirmado BOOLEAN DEFAULT 0,
      checkin BOOLEAN DEFAULT 0,
      horarioCheckin TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Error creating guests table:', err);
    } else {
      console.log('Guests table ready');
    }
  });
});

// API Endpoints
// Get all guests
app.get('/api/guests', (req, res) => {
  db.all('SELECT * FROM guests', [], (err, rows) => {
    if (err) {
      console.error('Error fetching guests:', err);
      return res.status(500).json({ error: 'Erro ao buscar convidados: ' + err.message });
    }
    res.json(rows);
  });
});

// Add a new guest
app.post('/api/guests', (req, res) => {
  const { nome, email, cpf, telefone, empresa, observacoes } = req.body;
  if (!nome || !email) {
    return res.status(400).json({ error: 'Nome e email são obrigatórios' });
  }
  db.run(
    `INSERT INTO guests (nome, email, cpf, telefone, empresa, observacoes, confirmado, checkin, horarioCheckin)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, NULL)`,
    [nome, email, cpf || '', telefone || '', empresa || '', observacoes || ''],
    function (err) {
      if (err) {
        console.error('Error inserting guest:', err);
        return res.status(500).json({ error: 'Erro ao cadastrar convidado: ' + err.message });
      }
      res.json({ id: this.lastID });
    }
  );
});

// Update guest confirmation status
app.patch('/api/guests/:id/confirm', (req, res) => {
  const { id } = req.params;
  db.get('SELECT confirmado FROM guests WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Error fetching guest for confirmation:', err);
      return res.status(500).json({ error: 'Erro ao confirmar presença: ' + err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Convidado não encontrado' });
    }
    const newStatus = !row.confirmado;
    db.run(
      'UPDATE guests SET confirmado = ? WHERE id = ?',
      [newStatus, id],
      (err) => {
        if (err) {
          console.error('Error updating confirmation:', err);
          return res.status(500).json({ error: 'Erro ao confirmar presença: ' + err.message });
        }
        res.json({ success: true });
      }
    );
  });
});

// Perform check-in
app.patch('/api/guests/:id/checkin', (req, res) => {
  const { id } = req.params;
  const horarioCheckin = new Date().toLocaleString('pt-BR');
  db.run(
    'UPDATE guests SET checkin = 1, confirmado = 1, horarioCheckin = ? WHERE id = ?',
    [horarioCheckin, id],
    (err) => {
      if (err) {
        console.error('Error performing check-in:', err);
        return res.status(500).json({ error: 'Erro ao realizar check-in: ' + err.message });
      }
      res.json({ success: true, horarioCheckin });
    }
  );
});

// Delete a guest
app.delete('/api/guests/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM guests WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('Error deleting guest:', err);
      return res.status(500).json({ error: 'Erro ao remover convidado: ' + err.message });
    }
    res.json({ success: true });
  });
});

// Import guests from CSV
app.post('/api/guests/import', (req, res) => {
  const guests = req.body;
  if (!Array.isArray(guests)) {
    return res.status(400).json({ error: 'Dados de importação inválidos' });
  }

  const stmt = db.prepare(
    `INSERT INTO guests (nome, email, cpf, telefone, empresa, observacoes, confirmado, checkin, horarioCheckin)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, NULL)`
  );

  db.serialize(() => {
    guests.forEach((guest) => {
      if (guest.nome && guest.email) {
        stmt.run([
          guest.nome,
          guest.email,
          guest.cpf || '',
          guest.telefone || '',
          guest.empresa || '',
          '',
        ], (err) => {
          if (err) {
            console.error('Error inserting guest during import:', err);
          }
        });
      }
    });
    stmt.finalize((err) => {
      if (err) {
        console.error('Error finalizing import:', err);
        return res.status(500).json({ error: 'Erro ao importar convidados: ' + err.message });
      }
      res.json({ success: true, count: guests.length });
    });
  });
});

// Export report as CSV
app.get('/api/report', (req, res) => {
  db.all('SELECT * FROM guests', [], (err, rows) => {
    if (err) {
      console.error('Error generating report:', err);
      return res.status(500).json({ error: 'Erro ao gerar relatório: ' + err.message });
    }
    const csv = [
      ['Nome', 'Email', 'Telefone', 'Empresa', 'Status', 'Check-in', 'Horário Check-in'],
      ...rows.map((c) => [
        c.nome,
        c.email,
        c.telefone || '',
        c.empresa || '',
        c.confirmado ? 'Confirmado' : 'Pendente',
        c.checkin ? 'Presente' : 'Ausente',
        c.horarioCheckin || '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    res.header('Content-Type', 'text/csv');
    res.attachment(`relatorio-presenca-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  });
});

// Serve the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
});