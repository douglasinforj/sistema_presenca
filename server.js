const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const csvParser = require('csv-parser');
const { error } = require('console');


//leitura de variaveis de ambiente
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// configurando Cors
const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATH', 'DELETE'],

}

// configurando middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


//Criando diretorio de dados 'pasta data'
const dataDir = path.join(__dirname, 'data');
if(!fs.existsSync(dataDir)){
    try {
        fs.mkdirSync(dataDir);
    } catch (err){
        console.warn('Diretório não pode ser criado, usar diretório raiz', err);
    }
}

// Inicializando SQLITE (database)
const dbPath = process.env.DATABASE_PATH || (fs.existsSync(dataDir)
    ? path.join(dataDir, 'guests.db')
    : path.join(__dirname, 'guests.db')
);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao SQLite database:', err);
    }else {
        console.log(`Connectado ao banco de dados SQLite ${dbPath}`);
    }
})

//Criando a tabela guests caso não exista
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
  `);
});