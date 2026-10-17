const express = require('express');
const router = express.Router();

const usuarioController = require('../controllers/Usuario_Controller');
const responsaveisController = require('../controllers/Responsaveis_Controller');
const babaController = require('../controllers/Baba_Controller');
const agendamentosController = require('../controllers/Agendamentos_Controller');
const conversasController = require('../controllers/Conversas_Controller');
const cadastroController = require('../controllers/Cadastro_Controller');
const sessaoController = require('../controllers/Sessao_Controller');
const Sessoes = require('../middleware/Sessoes');

// Rotas de Usuários Gerais
router.post('/cadastros', cadastroController.cadastrar);
router.post('/sessao', sessaoController.entrar);
router.get('/sessao', Sessoes.exigirAutenticacao, sessaoController.perfilAtual);
router.delete('/sessao', Sessoes.exigirAutenticacao, sessaoController.sair);
router.get('/usuarios', usuarioController.listar);
router.get('/usuarios/:codigo', usuarioController.buscarPorCodigo);
router.post('/usuarios', usuarioController.cadastrar);

// Rotas de Responsáveis (Pais)
router.get('/responsaveis', responsaveisController.listar);
router.post('/responsaveis', responsaveisController.cadastrar);

// Rotas de Babás (Apenas ativas no site público)
router.get('/babas', babaController.listarAtivas);
router.get('/babas/:codigo', agendamentosController.buscarPerfilBaba);
router.get('/babas/:codigo/perfil', Sessoes.exigirAutenticacao, babaController.buscarMeuPerfil);
router.get('/babas/:codigo/disponibilidade', babaController.buscarDisponibilidade);
router.put('/babas/:codigo/perfil', Sessoes.exigirAutenticacao, babaController.atualizarPerfilPublico);
router.put('/babas/:codigo/disponibilidade', Sessoes.exigirAutenticacao, babaController.salvarDisponibilidade);

// Solicitações temporárias e compromissos aceitos
router.get('/solicitacoes/pendentes', Sessoes.exigirAutenticacao, agendamentosController.listarSolicitacoes);
router.post('/solicitacoes/entrevistas', Sessoes.exigirAutenticacao, agendamentosController.solicitarEntrevista);
router.post('/solicitacoes/contratos', Sessoes.exigirAutenticacao, agendamentosController.solicitarContrato);
router.post('/solicitacoes/entrevistas/:id/aceitar', Sessoes.exigirAutenticacao, agendamentosController.aceitarEntrevista);
router.post('/solicitacoes/contratos/:id/aceitar', Sessoes.exigirAutenticacao, agendamentosController.aceitarContrato);
router.delete('/solicitacoes/entrevistas/:id', Sessoes.exigirAutenticacao, agendamentosController.recusarEntrevista);
router.delete('/solicitacoes/contratos/:id', Sessoes.exigirAutenticacao, agendamentosController.recusarContrato);
router.get('/entrevistas', Sessoes.exigirAutenticacao, agendamentosController.listarEntrevistas);
router.get('/contratos', Sessoes.exigirAutenticacao, agendamentosController.listarContratos);
router.post('/contratos/:id/finalizar', Sessoes.exigirAutenticacao, agendamentosController.finalizarContrato);
router.post('/contratos/:id/avaliacao', Sessoes.exigirAutenticacao, agendamentosController.avaliarContrato);
router.get('/conversas', Sessoes.exigirAutenticacao, conversasController.listar);
router.post('/conversas', Sessoes.exigirAutenticacao, conversasController.iniciar);
router.get('/conversas/:id/mensagens', Sessoes.exigirAutenticacao, conversasController.listarMensagens);
router.post('/conversas/:id/mensagens', Sessoes.exigirAutenticacao, conversasController.enviarMensagem);

module.exports = router;