const express = require('express');
const router = express.Router();
const db = require('../database/db');

// CADASTRO
router.post('/cadastro', (req, res) => {
    const { username, senha } = req.body;
    if (!username || !senha) return res.json({ erro: "Preencha tudo!" });

    db.run("INSERT INTO usuarios (username, senha, saldo) VALUES (?, ?, 0)", [username, senha], function(err) {
        if (err) return res.json({ erro: "Usuário já existe." });
        res.json({ id: this.lastID, username, saldo: 0, mensagem: "Sucesso!" });
    });
});

// LOGIN
router.post('/login', (req, res) => {
    const { username, senha } = req.body;
    db.get("SELECT id, username, saldo FROM usuarios WHERE username = ? AND senha = ?", [username, senha], (err, row) => {
        if (err || !row) return res.json({ erro: "Dados incorretos" });
        res.json({ id: row.id, username: row.username, saldo: row.saldo || 0 });
    });
});

// ATUALIZAR SALDO
router.post('/atualizar-saldo', (req, res) => {
    const { id, saldo } = req.body;
    db.run("UPDATE usuarios SET saldo = ? WHERE id = ?", [saldo, id], (err) => {
        if (err) return res.status(400).json({ erro: err.message });
        res.json({ success: true });
    });
});

// PEGAR DADOS (Saldo atualizado)
router.post('/meus-dados', (req, res) => {
    const { id } = req.body;
    db.get("SELECT saldo FROM usuarios WHERE id = ?", [id], (err, row) => {
        if (err || !row) return res.json({ saldo: 0 });
        res.json({ saldo: row.saldo });
    });
});

module.exports = router;