const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Load environment variables
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// JWT authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Acesso não autorizado: Token não fornecido' });
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Acesso não autorizado: Token inválido' });
    }
    req.user = user;
    next();
  });
};

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

// Create tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
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

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('Users table ready');
      const defaultEmail = 'admin@admin';
      const defaultPassword = 'admin#123';
      bcrypt.hash(defaultPassword, 10, (err, hash) => {
        if (err) {
          console.error('Error hashing default password:', err);
          return;
        }
        db.run(
          `INSERT OR IGNORE INTO users (email, password) VALUES (?, ?)`,
          [defaultEmail, hash],
          (err) => {
            if (err) {
              console.error('Error creating default user:', err);
            } else {
              console.log('Default user created:', defaultEmail);
            }
          }
        );
      });
    }
  });
});

// API Endpoints
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ error: 'Erro ao autenticar usuário' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }
    bcrypt.compare(password, user.password, (err, result) => {
      if (err) {
        console.error('Error comparing passwords:', err);
        return res.status(500).json({ error: 'Erro ao autenticar usuário' });
      }
      if (!result) {
        return res.status(401).json({ error: 'Email ou senha inválidos' });
      }
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
      res.json({ token });
    });
  });
});

app.post('/api/guests', authenticateToken, (req, res) => {
  const { nome, email, cpf, telefone, empresa, observacoes } = req.body;
  console.log('Received guest data:'/*, { nome, email, cpf, telefone, empresa, observacoes }*/);
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
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Email já cadastrado' });
        }
        return res.status(500).json({ error: 'Erro ao cadastrar convidado: ' + err.message });
      }
      console.log('Guest inserted with ID:', this.lastID);
      res.json({ id: this.lastID });
    }
  );
});

app.get('/api/guests', authenticateToken, (req, res) => {
  db.all('SELECT * FROM guests', [], (err, rows) => {
    if (err) {
      console.error('Error fetching guests:', err);
      return res.status(500).json({ error: 'Erro ao buscar convidados: ' + err.message });
    }
    res.json(rows);
  });
});

app.patch('/api/guests/:id/confirm', authenticateToken, (req, res) => {
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

app.patch('/api/guests/:id/checkin', authenticateToken, (req, res) => {
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

app.delete('/api/guests/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM guests WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('Error deleting guest:', err);
      return res.status(500).json({ error: 'Erro ao remover convidado: ' + err.message });
    }
    res.json({ success: true });
  });
});

app.post('/api/guests/import', authenticateToken, (req, res) => {
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

app.get('/api/report', authenticateToken, (req, res) => {
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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
});