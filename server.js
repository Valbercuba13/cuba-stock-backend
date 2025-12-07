const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express();

app.use(express.json());
app.use(cors());

// CONEXÃO COM O BANCO DE DADOS
// Mudei o nome para garantir que crie um banco novo e limpo
const db = new sqlite3.Database('./banco_oficial.db', (err) => {
    if (err) console.error('Erro BD:', err.message);
    else console.log('✅ Banco de dados OFICIAL conectado.');
});

// CRIA AS TABELAS
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

// --- MIDDLEWARE DE LOG (O Dedo-Duro) ---
app.use((req, res, next) => {
    console.log(`📡 RECEBI: ${req.method} ${req.url}`);
    // console.log('📦 DADOS:', JSON.stringify(req.body)); // Descomente se quiser ver o corpo
    next();
});

// --- ROTAS (REMOVI O '/api' DA FRENTE PARA CASAR COM O APP) ---

// 1. LISTAR TUDO
app.get('/estoque', (req, res) => {
    db.all("SELECT * FROM itens", [], (err, rows) => {
        if (err) return res.status(400).json(err);
        res.json(rows);
    });
});

// 2. ATUALIZAR QUANTIDADE
app.post('/atualizar', (req, res) => {
    const { id, novaQtd } = req.body;
    db.run("UPDATE itens SET qtd = ? WHERE id = ?", [novaQtd, id], function(err) {
        if (err) return res.status(400).json(err);
        res.json({ changes: this.changes });
    });
});

// 3. ADICIONAR NOVO ITEM (COM LOG DE DEPURAÇÃO)
app.post('/novo-item', (req, res) => {
    const { categoria, nome, qtd, min, unidade } = req.body;
    const unidadeFinal = unidade || 'un';
    
    console.log(`📝 Tentando gravar: ${nome} em ${categoria}...`);

    db.run("INSERT INTO itens (categoria, nome, qtd, min, unidade) VALUES (?, ?, ?, ?, ?)", 
        [categoria, nome, qtd, min, unidadeFinal], 
        function(err) {
            if (err) {
                console.error("❌ Erro ao gravar no banco:", err.message);
                return res.status(400).json({ error: err.message });
            }
            console.log(`✅ Sucesso! Item criado com ID: ${this.lastID}`);
            res.json({ id: this.lastID });
        });
});

// 4. LISTA DE COMPRAS
app.get('/lista-compras', (req, res) => {
    db.all("SELECT * FROM itens WHERE qtd < min", [], (err, rows) => {
        if (err) return res.status(400).json(err);
        const lista = rows.map(item => {
            let falta = item.min - item.qtd;
            if (item.unidade === 'kg') falta = parseFloat(falta.toFixed(3));
            return { ...item, comprar: falta, produto: item.nome };
        });
        res.json(lista);
    });
});

// 5. FINALIZAR COMPRA
app.post('/finalizar-compra', (req, res) => {
    const { total, itens } = req.body;
    const dataHoje = new Date().toISOString();
    
    db.serialize(() => {
        db.run(`INSERT INTO historico_compras (data, total, itens_json) VALUES (?, ?, ?)`, 
            [dataHoje, total, JSON.stringify(itens)], 
            function(err) {
                if (err) return res.status(400).json({ error: err.message });
                console.log(`💰 Venda registrada. Atualizando estoque...`);
                
                const stmt = db.prepare("UPDATE itens SET qtd = qtd + ? WHERE id = ?");
                itens.forEach(item => {
                    if (item.id && item.comprar) stmt.run(item.comprar, item.id);
                });
                stmt.finalize();
                res.json({ message: "Sucesso" });
            }
        );
    });
});

// 6. HISTÓRICO
app.get('/historico', (req, res) => {
    db.all("SELECT * FROM historico_compras ORDER BY id DESC LIMIT 10", [], (err, rows) => {
        if (err) return res.status(400).json(err);
        res.json(rows);
    });
});

// EXTRAS
app.post('/editar-produto', (req, res) => {
    const { id, nome, min, unidade } = req.body;
    db.run("UPDATE itens SET nome = ?, min = ?, unidade = ? WHERE id = ?", [nome, min, unidade, id], (err) => {
        if (err) return res.status(400).json(err);
        res.json({ message: "Atualizado" });
    });
});

app.post('/deletar-item', (req, res) => {
    db.run("DELETE FROM itens WHERE id = ?", [req.body.id], (err) => {
        if (err) return res.status(400).json(err);
        res.json({ message: "Deletado" });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🔥 Server Cuba Stock rodando na porta ${PORT}`);
});