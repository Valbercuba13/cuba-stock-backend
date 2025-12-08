const express = require('express');
const router = express.Router();
const db = require('../database/db');

// CADASTRO
router.post('/cadastro', (req, res) => {
    const { username, senha } = req.body;
    
    if (!username || !senha) {
        return res.json({ erro: "Preencha usuário e senha!" });
    }

    // Tenta inserir. Se der erro (ex: usuário duplicado), o callback avisa.
    db.run("INSERT INTO usuarios (username, senha) VALUES (?, ?)", [username, senha], function(err) {
        if (err) {
            console.error(err.message);
            return res.json({ erro: "Usuário já existe ou erro no servidor." });
        }
        res.json({ id: this.lastID, username, mensagem: "Cadastrado com sucesso!" });
    });
});

// LOGIN
router.post('/login', (req, res) => {
    const { username, senha } = req.body;
    
    db.get("SELECT * FROM usuarios WHERE username = ? AND senha = ?", [username, senha], (err, row) => {
        if (err) return res.json({ erro: "Erro interno" });
        
        if (!row) {
            return res.json({ erro: "Usuário ou senha incorretos" });
        }
        
        // Retorna os dados para o app salvar
        res.json({ id: row.id, username: row.username });
    });
});

module.exports = router;