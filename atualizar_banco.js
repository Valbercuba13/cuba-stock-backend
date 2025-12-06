const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./mercado.db');

db.serialize(() => {
    // Adiciona a coluna 'unidade' se ela não existir
    // Por padrão, tudo que já existe vira 'un' (unidade)
    try {
        db.run("ALTER TABLE itens ADD COLUMN unidade TEXT DEFAULT 'un'");
        console.log("Coluna 'unidade' adicionada com sucesso!");
    } catch (e) {
        console.log("A coluna provavelmente já existe ou deu erro:", e.message);
    }
});

db.close();