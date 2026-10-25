const express = require('express');
const router = express.Router();

const usuarioController = require('../controllers/Usuario_Controller');
const responsaveisController = require('../controllers/Responsaveis_Controller');
const babaController = require('../controllers/Baba_Controller');
const agendamentosController = require('../controllers/Agendamentos_Controller');
const notificacoesController = require('../controllers/Notificacoes_Controller');
const conversasController = require('../controllers/Conversas_Controller');
const cadastroController = require('../controllers/Cadastro_Controller');
const sessaoController = require('../controllers/Sessao_Controller');
const uploadsBaba = require('../middleware/UploadsBaba');
const Sessoes = require('../middleware/Sessoes');
const { limiteLogin, limiteCadastro } = require('../middleware/Seguranca');

// Rotas de Usuários Gerais
router.post('/cadastros', limiteCadastro, uploadsBaba.diploma, cadastroController.cadastrar);
router.post('/sessao', limiteLogin, sessaoController.entrar);
router.get('/sessao', Sessoes.exigirAutenticacao, sessaoController.perfilAtual);
router.delete('/sessao', Sessoes.exigirAutenticacao, sessaoController.sair);
router.post('/conta/reativar', Sessoes.exigirAutenticacao, babaController.reativarMinhaConta);
router.get('/usuarios', usuarioController.listar);
router.get('/usuarios/:codigo', usuarioController.buscarPorCodigo);
router.post('/usuarios', limiteCadastro, usuarioController.cadastrar);

// Rotas de Responsáveis (Pais)
router.get('/responsaveis', responsaveisController.listar);
router.post('/responsaveis', limiteCadastro, responsaveisController.cadastrar);

// Rotas de Babás (Apenas ativas no site público)
router.get('/babas', babaController.listarAtivas);
router.get('/babas/:codigo', agendamentosController.buscarPerfilBaba);
router.get('/babas/:codigo/disponibilidade', babaController.buscarDisponibilidade);
router.use(Sessoes.exigirAutenticacao, Sessoes.exigirContaAtiva);
router.get('/babas/:codigo/perfil', Sessoes.exigirAutenticacao, babaController.buscarMeuPerfil);
router.get('/babas/:codigo/foto', Sessoes.exigirAutenticacao, babaController.exigirPerfilDaBaba, babaController.buscarFoto);
router.post('/babas/:codigo/foto', Sessoes.exigirAutenticacao, babaController.exigirPerfilDaBaba, uploadsBaba.foto, babaController.atualizarFoto);
router.get('/babas/:codigo/certidao', Sessoes.exigirAutenticacao, babaController.exigirPerfilDaBaba, babaController.buscarCertidao);
router.post('/babas/:codigo/certidao', Sessoes.exigirAutenticacao, babaController.exigirPerfilDaBaba, uploadsBaba.certidao, babaController.atualizarCertidao);
router.delete('/babas/:codigo/certidao', Sessoes.exigirAutenticacao, babaController.exigirPerfilDaBaba, babaController.removerCertidao);
router.get('/babas/:codigo/diploma', Sessoes.exigirAutenticacao, babaController.exigirPerfilDaBaba, babaController.buscarDiploma);
router.post('/babas/:codigo/diploma', Sessoes.exigirAutenticacao, babaController.exigirPerfilDaBaba, uploadsBaba.diploma, babaController.atualizarDiploma);
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
router.post('/entrevistas/:id/finalizar', Sessoes.exigirAutenticacao, agendamentosController.finalizarEntrevista);
router.post('/entrevistas/:id/avaliacao', Sessoes.exigirAutenticacao, agendamentosController.avaliarEntrevista);
router.get('/pagamentos', Sessoes.exigirAutenticacao, agendamentosController.listarPagamentos);
router.post('/pagamentos/:id/pagar', Sessoes.exigirAutenticacao, agendamentosController.pagarContrato);
router.get('/notificacoes', Sessoes.exigirAutenticacao, notificacoesController.listar);
router.post('/notificacoes/lidas', Sessoes.exigirAutenticacao, notificacoesController.marcarTodasLidas);
router.post('/notificacoes/:id/lida', Sessoes.exigirAutenticacao, notificacoesController.marcarLida);
router.post('/contratos/:id/denunciar-nao-pagamento', Sessoes.exigirAutenticacao, notificacoesController.denunciarPagamento);
router.get('/contratos', Sessoes.exigirAutenticacao, agendamentosController.listarContratos);
router.post('/contratos/:id/finalizar', Sessoes.exigirAutenticacao, agendamentosController.finalizarContrato);
router.post('/contratos/:id/avaliacao', Sessoes.exigirAutenticacao, agendamentosController.avaliarContrato);
router.get('/conversas', Sessoes.exigirAutenticacao, conversasController.listar);
router.post('/conversas', Sessoes.exigirAutenticacao, conversasController.iniciar);
router.get('/conversas/:id/mensagens', Sessoes.exigirAutenticacao, conversasController.listarMensagens);
router.post('/conversas/:id/mensagens', Sessoes.exigirAutenticacao, conversasController.enviarMensagem);

module.exports = router;