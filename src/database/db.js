const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho do arquivo do banco (volta 2 pastas para salvar na raiz do backend)
const dbPath = path.resolve(__dirname, '../../banco_multi.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('❌ Erro ao conectar no BD:', err.message);
    else console.log('✅ Banco de dados conectado (Modular).');
});

// Inicialização das Tabelas
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        senha TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS itens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dono_id INTEGER,
        categoria TEXT, nome TEXT, qtd REAL, min REAL, unidade TEXT DEFAULT 'un'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS historico_compras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dono_id INTEGER,
        data TEXT, total REAL, itens_json TEXT
    )`);
});

module.exports = db;