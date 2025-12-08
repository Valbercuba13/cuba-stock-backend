const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware simples para garantir que tem dono_id (opcional, mas boa prática)
const verificarDono = (req, res, next) => {
    if (!req.body.dono_id) {
        return res.status(400).json({ erro: "ID do usuário não fornecido." });
    }
    next();
};

// 1. LISTAR ESTOQUE
router.post('/listar', verificarDono, (req, res) => {
    const { dono_id } = req.body;
    db.all("SELECT * FROM itens WHERE dono_id = ?", [dono_id], (err, rows) => {
        if (err) return res.status(400).json(err);
        res.json(rows);
    });
});

// 2. NOVO ITEM
router.post('/novo-item', verificarDono, (req, res) => {
    const { dono_id, categoria, nome, qtd, min, unidade } = req.body;
    const unidadeFinal = unidade || 'un';

    db.run("INSERT INTO itens (dono_id, categoria, nome, qtd, min, unidade) VALUES (?, ?, ?, ?, ?, ?)", 
        [dono_id, categoria, nome, qtd, min, unidadeFinal], 
        function(err) {
            if (err) return res.status(400).json(err);
            res.json({ id: this.lastID });
        });
});

// 3. ATUALIZAR ITEM
router.post('/atualizar', verificarDono, (req, res) => {
    const { id, novaQtd, dono_id } = req.body;
    db.run("UPDATE itens SET qtd = ? WHERE id = ? AND dono_id = ?", [novaQtd, id, dono_id], function(err) {
        if (err) return res.status(400).json(err);
        res.json({ changes: this.changes });
    });
});

// 4. LISTA DE COMPRAS (Filtra o que está abaixo do mínimo)
router.post('/lista-compras', verificarDono, (req, res) => {
    const { dono_id } = req.body;
    db.all("SELECT * FROM itens WHERE dono_id = ? AND qtd < min", [dono_id], (err, rows) => {
        if (err) return res.status(400).json(err);
        
        const lista = rows.map(item => {
            let falta = item.min - item.qtd;
            if (item.unidade === 'kg') falta = parseFloat(falta.toFixed(3));
            return { ...item, comprar: falta, produto: item.nome };
        });
        res.json(lista);
    });
});

// 5. FINALIZAR COMPRA E ATUALIZAR ESTOQUE
router.post('/finalizar-compra', verificarDono, (req, res) => {
    const { dono_id, total, itens } = req.body;
    const dataHoje = new Date().toISOString();
    
    db.serialize(() => {
        // Registra no histórico
        db.run(`INSERT INTO historico_compras (dono_id, data, total, itens_json) VALUES (?, ?, ?, ?)`, 
            [dono_id, dataHoje, total, JSON.stringify(itens)], 
            function(err) {
                if (err) return res.status(400).json({ error: err.message });
                
                // Atualiza o estoque item a item
                const stmt = db.prepare("UPDATE itens SET qtd = qtd + ? WHERE id = ? AND dono_id = ?");
                itens.forEach(item => {
                    if (item.id && item.comprar) {
                        stmt.run(item.comprar, item.id, dono_id);
                    }
                });
                stmt.finalize();
                res.json({ message: "Sucesso" });
            }
        );
    });
});

// 6. HISTÓRICO DE COMPRAS
router.post('/historico', verificarDono, (req, res) => {
    const { dono_id } = req.body;
    db.all("SELECT * FROM historico_compras WHERE dono_id = ? ORDER BY id DESC LIMIT 10", [dono_id], (err, rows) => {
        if (err) return res.status(400).json(err);
        res.json(rows);
    });
});

// EXTRAS: EDITAR E DELETAR
router.post('/editar-produto', verificarDono, (req, res) => {
    const { id, dono_id, nome, min, unidade } = req.body;
    db.run("UPDATE itens SET nome = ?, min = ?, unidade = ? WHERE id = ? AND dono_id = ?", [nome, min, unidade, id, dono_id], (err) => {
        if (err) return res.status(400).json(err);
        res.json({ message: "Atualizado" });
    });
});

router.post('/deletar-item', verificarDono, (req, res) => {
    const { id, dono_id } = req.body;
    db.run("DELETE FROM itens WHERE id = ? AND dono_id = ?", [id, dono_id], (err) => {
        if (err) return res.status(400).json(err);
        res.json({ message: "Deletado" });
    });
});

module.exports = router;