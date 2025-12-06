const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express();

app.use(express.json());
app.use(cors());

// CONEXÃO COM O BANCO
// Mude para algo novo:
const db = new sqlite3.Database('./cuba_db.sqlite', (err) => {
    if (err) console.error('Erro BD:', err.message);
    else console.log('✅ Banco de dados NOVO conectado.');
});

// CRIAÇÃO DE TABELAS
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS itens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoria TEXT, nome TEXT, qtd REAL, min REAL, unidade TEXT DEFAULT 'un'
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS historico_compras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT, total REAL, itens_json TEXT
    )`);
});

// --- ROTAS DE LEITURA ---
app.get('/api/estoque', (req, res) => {
    db.all("SELECT * FROM itens", [], (err, rows) => {
        if (err) return res.status(400).json(err);
        res.json(rows);
    });
});

app.get('/api/lista-compras', (req, res) => {
    db.all("SELECT * FROM itens WHERE qtd < min", [], (err, rows) => {
        if (err) return res.status(400).json(err);
        const lista = rows.map(item => {
            let falta = item.min - item.qtd;
            if (item.unidade === 'kg') falta = parseFloat(falta.toFixed(3));
            return {
                id: item.id, // IMPORTANTE: ID necessário para atualização
                categoria: item.categoria,
                produto: item.nome,
                nome: item.nome,
                unidade: item.unidade || 'un',
                comprar: falta
            };
        });
        res.json(lista);
    });
});

app.get('/api/historico', (req, res) => {
    db.all("SELECT * FROM historico_compras ORDER BY id DESC LIMIT 10", [], (err, rows) => {
        if (err) return res.status(400).json(err);
        res.json(rows);
    });
});

// --- ROTAS DE ESCRITA ---

app.post('/api/atualizar', (req, res) => {
    const { id, novaQtd } = req.body;
    db.run("UPDATE itens SET qtd = ? WHERE id = ?", [novaQtd, id], function(err) {
        if (err) return res.status(400).json(err);
        res.json({ changes: this.changes });
    });
});

app.post('/api/novo-item', (req, res) => {
    const { categoria, nome, qtd, min, unidade } = req.body;
    db.run("INSERT INTO itens (categoria, nome, qtd, min, unidade) VALUES (?, ?, ?, ?, ?)", 
        [categoria, nome, qtd, min, unidade || 'un'], function(err) {
        if (err) return res.status(400).json(err);
        res.json({ id: this.lastID });
    });
});

app.post('/api/editar-produto', (req, res) => {
    const { id, nome, min, unidade } = req.body;
    db.run("UPDATE itens SET nome = ?, min = ?, unidade = ? WHERE id = ?", [nome, min, unidade, id], (err) => {
        if (err) return res.status(400).json(err);
        res.json({ message: "Atualizado" });
    });
});

app.post('/api/deletar-item', (req, res) => {
    db.run("DELETE FROM itens WHERE id = ?", [req.body.id], (err) => {
        if (err) return res.status(400).json(err);
        res.json({ message: "Deletado" });
    });
});

// --- ROTA DE FINALIZAR COMPRA (CORRIGIDA E BLINDADA) ---
app.post('/api/finalizar-compra', (req, res) => {
    const { total, itens } = req.body;
    const dataHoje = new Date().toISOString();
    
    console.log(`🛒 Recebendo compra: R$ ${total} com ${itens.length} itens.`);

    // 1. INSERE HISTÓRICO
    db.run(`INSERT INTO historico_compras (data, total, itens_json) VALUES (?, ?, ?)`, 
        [dataHoje, total, JSON.stringify(itens)], 
        function(err) {
            if (err) return res.status(400).json({ error: "Erro ao salvar histórico" });
            
            const idHistorico = this.lastID;
            console.log(`✅ Histórico salvo (ID: ${idHistorico}). Iniciando atualização de estoque...`);

            // 2. ATUALIZA O ESTOQUE ITEM POR ITEM (Usando Promise para esperar tudo)
            const updates = itens.map(item => {
                return new Promise((resolve, reject) => {
                    // Soma o que tinha (qtd) + o que comprou (item.comprar)
                    db.run("UPDATE itens SET qtd = qtd + ? WHERE id = ?", 
                        [item.comprar, item.id], 
                        function(err) {
                            if (err) {
                                console.error(`❌ Erro item ${item.id}:`, err.message);
                                reject(err);
                            } else {
                                console.log(`🔄 Item ${item.id} atualizado: +${item.comprar}`);
                                resolve();
                            }
                        }
                    );
                });
            });

            // 3. Só responde ao celular quando TODAS as atualizações terminarem
            Promise.all(updates)
                .then(() => {
                    console.log("🚀 Estoque 100% atualizado. Respondendo ao App.");
                    res.json({ message: "Compra finalizada com sucesso!" });
                })
                .catch((error) => {
                    console.error("Erro na atualização em massa:", error);
                    res.status(500).json({ error: "Erro parcial na atualização do estoque" });
                });
        }
    );
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🔥 Server Cuba Stock rodando na porta ${PORT}`);
});