const express = require('express');
const path = require('path');
const adminRoutes = require('./routes/Admin_API');
const { configurarSeguranca, tratarErroRequisicao } = require('./middleware/Seguranca');

const adminApp = express();

configurarSeguranca(adminApp);
adminApp.use(express.json({ limit: '32kb' }));

adminApp.get('/', (req, res) => res.redirect('/html/admin/login-admin.html'));

// O painel fica separado em private; logos e links públicos vêm de public.
adminApp.use(express.static(path.join(__dirname, '../private')));
adminApp.use('/public', express.static(path.join(__dirname, '../public')));

// Registro das rotas da API Admin
adminApp.use('/admin/api', adminRoutes);
adminApp.use(tratarErroRequisicao);

module.exports = adminApp;