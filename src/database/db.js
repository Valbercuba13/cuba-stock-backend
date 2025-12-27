const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Salva o banco na raiz do backend com nome 'banco_multi.db'
const dbPath = path.resolve(__dirname, '../../banco_multi.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('❌ Erro BD:', err.message);
    else console.log('✅ Banco de dados conectado (Modular).');
});

db.serialize(() => {
    // Tabela de Usuários
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        senha TEXT
    )`);

    // Tabela de Itens (Com dono_id)
    db.run(`CREATE TABLE IF NOT EXISTS itens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dono_id INTEGER,
        categoria TEXT, nome TEXT, qtd REAL, min REAL, unidade TEXT DEFAULT 'un'
    )`);

    // Tabela de Histórico (Com dono_id)
    db.run(`CREATE TABLE IF NOT EXISTS historico_compras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dono_id INTEGER,
        data TEXT, total REAL, itens_json TEXT
    )`);
});

module.exports = db;