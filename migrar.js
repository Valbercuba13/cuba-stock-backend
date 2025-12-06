const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');


const db = new sqlite3.Database('./mercado.db');


try {
    const dadosRaw = fs.readFileSync('./itens.json', 'utf8');
    const dadosJson = JSON.parse(dadosRaw);

    db.serialize(() => {
        
        db.run(`CREATE TABLE IF NOT EXISTS itens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            categoria TEXT,
            nome TEXT,
            qtd INTEGER,
            min INTEGER
        )`);

        
        const stmt = db.prepare("INSERT INTO itens (categoria, nome, qtd, min) VALUES (?, ?, ?, ?)");

        console.log("Iniciando migração...");

        
        for (const categoria in dadosJson) {
            const listaDeItens = dadosJson[categoria];

            listaDeItens.forEach(item => {
                let nome, qtd, min;

                if (typeof item === 'string') {
                    nome = item;
                    qtd = 0;  
                    min = 1;  
                } else {
                    nome = item.nome;
                    qtd = item.qtd || 0;
                    min = item.min || 1;
                }

                stmt.run(categoria, nome, qtd, min);
                console.log(`Inserido: ${nome} em ${categoria}`);
            });
        }

        stmt.finalize();
        console.log("Migração concluída com sucesso!");
    });

} catch (erro) {
    console.error("Erro ao ler o arquivo itens.json:", erro.message);
} finally {
    db.close();
}