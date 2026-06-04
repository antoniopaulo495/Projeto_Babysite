// src/index.js

import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { resolve } from 'node:path';
import router from './routes.js';
import Migration from './database/migration.js';
import Seed from './database/seeders.js';

const server = express();
const PORT = 3000;

// Morgan mostra no terminal, em tempo real, quais páginas/rotas estão sendo acessadas
server.use(morgan('tiny'));

// Configurações de CORS do professor (Evita erros de segurança ao conectar Front e Back)
server.use(
  cors({
    origin: '*',
    methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: false,
  })
);

// Permite que o servidor entenda dados enviados em formato JSON (vindo do seu api.js)
// Aumentamos o limite para aceitar imagens em Base64 durante o cadastro de perfil
server.use(express.json({ limit: '10mb' }));

// Servir arquivos estáticos (CSS, imagens e scripts visuais do seu Frontend)
server.use(express.static('public'));

// Define que todas as rotas de dados do babysite vão rodar sob o prefixo '/api'
server.use('/api', router);

// SUA ROTA PRINCIPAL: Abre o seu arquivo HTML da Home automaticamente ao acessar http://localhost:3000/
server.get('/', (req, res) => {
  res.sendFile(resolve('public', 'html', 'html_home', 'home.html'));
});

// Executa o banco de dados criando as tabelas se elas ainda não existirem
console.log('🔄 Analisando e estruturando tabelas do banco de dados...');
await Migration.up();
await Seed.up();

// Inicializa o seu servidor local
server.listen(PORT, () => {
    console.log(`\n🚀 ==========================================`);
    console.log(`✅ Servidor Babysite ON!`);
    console.log(`🏠 Site local: http://localhost:${PORT}`);
    console.log(`============================================\n`);
});