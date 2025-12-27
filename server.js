const express = require('express');
const cors = require('cors');
const app = express();


const authRoutes = require('./src/routes/auth');
const estoqueRoutes = require('./src/routes/estoque');

app.use(express.json());
app.use(cors());


app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.url}`);
    next();
});

// --- CONFIGURAÇÃO DAS ROTAS ---


app.use('/auth', authRoutes);


app.use('/api', estoqueRoutes);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🔥 Server Cuba Stock (Modular) rodando na porta ${PORT}`);
});