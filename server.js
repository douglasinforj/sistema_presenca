const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const csvParser = require('csv-parser');


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
app.use(express.static(path.join(__dirname, 'public')))

