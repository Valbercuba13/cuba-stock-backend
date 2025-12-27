const express = require('express');
const cors = require('cors');
const app = express();

// Importa as rotas
const authRoutes = require('./src/routes/auth');
const estoqueRoutes = require('./src/routes/estoque');

app.use(express.json());
app.use(cors());

// Log para debug
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.url}`);
    next();
});

// Configura as rotas com prefixos
app.use('/auth', authRoutes);
app.use('/api', estoqueRoutes);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🔥 Server Cuba Stock (Modular) rodando na porta ${PORT}`);
});