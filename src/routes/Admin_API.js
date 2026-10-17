const express = require('express');
const router = express.Router();

const adminController = require('../controllers/Admin_Controller');
const Sessoes = require('../middleware/Sessoes');

router.post('/sessao', adminController.entrar);
router.get('/sessao', Sessoes.exigirAutenticacao, Sessoes.exigirAdministrador, adminController.perfilAtual);
router.use(Sessoes.exigirAutenticacao, Sessoes.exigirAdministrador);

router.get('/resumo', adminController.resumo);
router.get('/usuarios', adminController.listarUsuarios);
router.get('/denuncias/avaliacoes', adminController.listarDenunciasAvaliacao);
router.put('/babas/:codigo/status', adminController.alterarStatusBaba);
router.delete('/babas/:codigo', adminController.excluirBaba);
router.delete('/sessao', Sessoes.encerrar);

module.exports = router;