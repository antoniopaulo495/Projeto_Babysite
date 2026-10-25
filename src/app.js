const express = require('express');
const path = require('path');
const publicRoutes = require('./routes/Public_API');
const { configurarSeguranca, tratarErroRequisicao } = require('./middleware/Seguranca');

const app = express();

configurarSeguranca(app);
app.use(express.json({ limit: '32kb' }));

app.get('/', (req, res) => res.redirect('/html/home/home.html'));

// Servir arquivos estáticos do Front-end Público (caso existam na pasta public)
app.use(express.static(path.join(__dirname, '../public')));

// Registro das rotas da API pública
app.use('/api', publicRoutes);
app.use(tratarErroRequisicao);

module.exports = app;