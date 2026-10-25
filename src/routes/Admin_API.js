const express = require('express');
const router = express.Router();

const adminController = require('../controllers/Admin_Controller');
const Sessoes = require('../middleware/Sessoes');
const { limiteLoginAdmin } = require('../middleware/Seguranca');

router.post('/sessao', limiteLoginAdmin, adminController.entrar);
router.get('/sessao', Sessoes.exigirAutenticacao, Sessoes.exigirAdministrador, adminController.perfilAtual);
router.use(Sessoes.exigirAutenticacao, Sessoes.exigirAdministrador);

router.get('/resumo', adminController.resumo);
router.put('/senha', adminController.alterarSenha);
router.get('/usuarios', adminController.listarUsuarios);
router.get('/certidoes', adminController.listarCertidoes);
router.get('/babas/:codigo/certidao', adminController.visualizarCertidao);
router.put('/babas/:codigo/certidao', adminController.alterarStatusCertidao);
router.get('/babas/:codigo/diploma', adminController.visualizarDiploma);
router.put('/babas/:codigo/diploma', adminController.alterarStatusDiploma);
router.get('/denuncias/avaliacoes', adminController.listarDenunciasAvaliacao);
router.put('/babas/:codigo/status', adminController.alterarStatusBaba);
router.delete('/babas/:codigo', adminController.excluirBaba);
router.delete('/sessao', Sessoes.encerrar);

module.exports = router;