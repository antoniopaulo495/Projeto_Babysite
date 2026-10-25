# Mapa de funcionalidades do Babysite

## Arquitetura de navegação

O sistema será organizado por interfaces próprias. A página `home.html` é a entrada pública. Depois do login ou cadastro, o usuário acessa a área correspondente ao seu perfil:

- **Home**: busca pública de babás, filtros e visualização resumida dos perfis.
- **Home Pais**: espaço do responsável, com as mesmas possibilidades de busca da Home e uma área de relacionamento no estilo WhatsApp Web.
- **Home Babá**: espaço profissional para disponibilidade, tarifa, documentos e entrevistas.
- **Home Admin**: painel de gestão, segurança e moderação da plataforma.

Cada página deve manter a separação de responsabilidades:

- HTML: estrutura e conteúdo da tela.
- CSS: identidade visual, layout responsivo e estados visuais.
- JavaScript: navegação, filtros, formulários, modais e alterações de status.

## Segurança da aplicação

- As senhas são armazenadas com derivação criptográfica `scrypt`, salt aleatório e comparação em tempo constante; não são armazenadas em texto puro.
- As sessões usam tokens aleatórios, expiram após 30 minutos sem atividade ou 12 horas de duração máxima, são removidas da memória periodicamente e as respostas autenticadas não devem ser armazenadas em cache.
- As aplicações pública e administrativa enviam cabeçalhos de segurança via Helmet, ocultam o cabeçalho de tecnologia do Express e limitam corpos JSON a 32 KB.
- Login, login administrativo e cadastro têm limites de tentativas por endereço IP. O armazenamento padrão desses limites e das sessões é local ao processo; várias instâncias exigem armazenamentos compartilhados antes de serem colocadas atrás de um balanceador.
- Em produção, o proxy de hospedagem deve fornecer HTTPS; HSTS é habilitado pelo servidor. `TRUST_PROXY_HOPS` deve corresponder ao número exato de proxies confiáveis; mantenha zero quando não houver proxy.
- A política CSP do Helmet permanece desativada porque as páginas ainda têm scripts e estilos inline. Tokens de sessão permanecem no `localStorage`; criptografia do SQLite e dos arquivos enviados, política CSP sem `unsafe-inline`, autenticação baseada em cookies HttpOnly e gestão de chaves são melhorias necessárias antes de tratar o sistema como pronto para produção.
- As dependências são auditadas com `npm audit`; a árvore de produção atual não apresenta vulnerabilidades conhecidas. A auditoria deve ser repetida regularmente após atualizações.

## Padrão das interfaces autenticadas

As áreas de Pais, Babá e Admin seguem o mesmo modelo de interface:

- **Barra lateral esquerda**: identidade do usuário, navegação pelas funcionalidades e contadores de pendências.
- **Área principal direita**: tela inicial da seção selecionada.
- **Cabeçalho da área de trabalho**: caminho da página, título, notificações e informações da sessão.
- **Estados visuais**: ativo, pendente, aprovado, recusado, banido e vazio.
- **Responsividade**: em telas menores a barra lateral vira menu recolhível.

## Home pública

### Início

- Apresentar a proposta do Babysite.
- Listar babás disponíveis.
- Pesquisar por nome.
- Filtrar por estado, município e tarifa máxima por hora.
- Combinar vários dias de disponibilidade; cada dia selecionado precisa estar disponível na babá, de segunda a sábado.
- Mostrar avaliação, disponibilidade e situação da verificação.
- Ao tentar abrir detalhes ou agendar sem autenticação, encaminhar para login/cadastro.

## Home Pais

### Navegação

- A barra lateral organiza as telas nesta ordem: Início, Conversas, Entrevistas, Contratos, Pagamentos e Configurações.
- Configurações permite encerrar a sessão.
- A central de notificações exibe avisos recentes, destaca os não lidos, permite marcar itens como lidos e atualiza automaticamente.

### Início

- Busca por babás disponíveis.
- Filtros por cidade, experiência e disponibilidade.
- Visualização dos perfis mais relevantes.
- Próximas entrevistas e conversas ativas.

### Perfil

- Abrir o perfil detalhado da babá selecionada em `perfil_baba`.
- Ver apresentação, experiência, avaliação e disponibilidade, quando informadas.
- Acessar informações principais antes de contratar.
- Conversar com a babá, solicitar entrevista ou propor contratação.

### Entrevistas e contratos

- O responsável envia uma solicitação de entrevista com data, horário e formato.
- A solicitação fica pendente para a babá; quando aceita, é removida das solicitações e cria um compromisso em Entrevistas para os dois perfis. Quando recusada, é removida sem criar entrevista.
- O responsável envia uma solicitação de contratação com período de início e fim, além dos dias e horários semanais em uma única solicitação.
- A proposta de contratação registra a tarifa fixa vigente da babá; perfis sem tarifa fixa não podem receber ou aceitar propostas.
- A solicitação fica pendente para a babá; quando aceita, é removida das solicitações e cria um contrato para os dois perfis. Quando recusada, é removida sem criar contrato.
- Consultar solicitações pendentes, entrevistas aceitas e contratos aceitos nas áreas de Pais e Babá.

### Pagamentos

- Calcular o custo previsto de cada contrato pela tarifa por hora, horários e ocorrências dos dias contratados entre as datas de início e fim.
- Exibir valores pendentes e pagos para o responsável.
- O botão **Pagar** registra uma quitação simulada e atualiza o mesmo contrato como pago na área da babá; não processa uma transação financeira real.
- Avisos enviados pela babá sobre contratos concluídos e ainda pendentes aparecem na central de notificações do responsável.
- Ao registrar o pagamento, o aviso correspondente é atualizado como resolvido e marcado como lido.

### Conversas

- Lista de conversas com babás.
- Enviar e receber mensagens persistidas no banco.
- Atualizar mensagens novas automaticamente enquanto a tela está aberta.
- Indicador de presença e mensagens não lidas.
- Botão **Agendar entrevista** abre um formulário central com data, horário, formato e mensagem opcional.
- A solicitação só vira entrevista na agenda se a babá aceitar; enquanto isso permanece pendente e pode ser recusada.

### Entrevistas e agendamentos

- Visualizar entrevistas aceitas com data, horário, formato e status.
- O responsável pode finalizar uma entrevista realizada; depois disso, somente a babá pode avaliá-la uma vez, com nota de 1 a 5.
- Notas de 1 a 3 exigem ao menos um motivo predefinido relacionado à experiência da babá com o responsável (por exemplo, ausência, informações divergentes ou conduta inadequada) e são encaminhadas anonimamente à administração como denúncia.
- Cancelar ou solicitar novo horário.
- Receber confirmação da babá.
- Consultar contratos aceitos, com período de início e fim e horários semanais.
- A babá pode finalizar o serviço de um contrato ativo; contratos também são concluídos automaticamente após a data final e deixam de aparecer na área da babá, permanecendo no banco de dados.
- Após a conclusão, o responsável pode avaliar o contrato uma única vez, com nota de 1 a 5.
- Em avaliações de 4 ou 5, o comentário é opcional e é enviado à babá. Notas de 1 a 3 exigem ao menos um motivo selecionado sobre a prestação do serviço; comentário continua opcional e os motivos e comentário são encaminhados à babá e à administração como denúncia anônima.
- A administração acompanha as denúncias de avaliação no painel; a listagem inclui nome da babá, nota, motivos, comentário e data, sem dados do responsável.

## Home Babá

### Navegação

- A barra lateral organiza as telas nesta ordem: Início, Conversas, Entrevistas, Contratos, Meu perfil, Pagamentos e Configurações.
- Configurações permite encerrar a sessão.
- A central de notificações exibe avisos recentes, destaca os não lidos, permite marcar itens como lidos e atualiza automaticamente.
- O sino também avisa quando faltam dados importantes no perfil profissional, como tarifa fixa, disponibilidade, localização, formas de pagamento, foto, certidão ou diploma. Ao abrir um aviso, a babá é direcionada a Meu perfil; ao preencher o dado, o aviso é encerrado e pode ser reaberto se a informação voltar a faltar.

### Início

- Resumo de visualizações, nota, tarifa e solicitações novas.
- Alertas para documentos e entrevistas pendentes.

### Meu perfil

- Editar apresentação profissional.
- Definir tarifa por hora.
- Cadastrar município e estado para aparecer nos filtros de localização.
- Informar experiência e disponibilidade.
- Cadastrar e alterar dias e horários habituais de trabalho, de segunda-feira a sábado. A disponibilidade é uma relação de horários por dia da semana associada à babá; não representa solicitação nem contrato.
- Cadastro da babá: dados principais, certidão opcional, diploma obrigatório de cuidadora infantil, estado e município, perfil, disponibilidade, tarifa por hora e senha. O diploma é enviado em PDF de até 10 MB, revisado no painel administrativo e pode ser reenviado em Meu perfil se for recusado.
- A babá pode acessar sua interface assim que concluir o cadastro, mas seu perfil só aparece na busca e só recebe solicitações de entrevista ou contrato depois que a administração aprovar o diploma. A aprovação não impede o acesso da babá às próprias telas.
- Definir tarifa por hora com valores sugeridos ou valor personalizado.
- Controlar quais informações aparecem para as famílias.

### Certidão de antecedentes

- Fazer upload de PDF.
- Exibir nome, data de envio, validade e status.
- Estados: aguardando análise, aprovado, recusado e documento expirado.
- Permitir novo envio quando o administrador solicitar.

### Entrevistas

- Receber solicitações de entrevista com data, horário e formato.
- Aceitar para criar o registro permanente na agenda de entrevistas ou recusar para remover a solicitação sem criar compromisso.
- Atualizar solicitações recebidas automaticamente enquanto a área está aberta.
- Consultar entrevistas aceitas.
- Avaliar entrevistas finalizadas com nota de 1 a 5; notas de até 3 exigem um motivo predefinido e são encaminhadas anonimamente à administração.

### Contratos

- Receber solicitações com período de início e fim e dias/horários semanais propostos pelo responsável.
- Aceitar para criar o contrato permanente ou recusar para remover a solicitação sem criar contrato.
- Consultar contratos aceitos e seus horários.
- Finalizar o serviço ao concluir o trabalho; essa ação libera a avaliação do contrato pelo responsável.

### Pagamentos

- Consultar o valor calculado de cada contrato, a partir da tarifa registrada na proposta, do período e dos horários semanais.
- Acompanhar os pagamentos pendentes e os valores registrados como pagos pelo responsável.
- Em contratos concluídos e ainda pendentes, enviar um aviso ao responsável; o mesmo contrato não pode gerar avisos duplicados.
- O status de pagamento é demonstrativo e não representa uma transação financeira real.

### Conversas

- Responder famílias em uma interface de chat com mensagens persistidas.
- Atualizar mensagens novas automaticamente enquanto a tela está aberta.
- Consultar o contexto da criança antes da entrevista.
- Receber alertas de novas mensagens.

## Home Admin

### Início

- Indicadores de usuários ativos, certidões pendentes, denúncias e índice de segurança.
- Atividades recentes.
- Atalhos para tarefas urgentes.

### Usuários

- Pesquisar usuários.
- Filtrar por babá, responsável, ativo, pendente ou banido.
- Abrir perfil e histórico.
- Moderar cadastro.
- Banir permanentemente uma babá ou desativá-la por 1 a 7 dias.
- A babá vê uma página de conta indisponível; durante a desativação o botão de reativação fica inativo e passa a funcionar quando o prazo termina.
- Reativar contas desativadas a qualquer momento, desbanir contas e aprovar cadastros pendentes.

### Certidões

- Listar documentos pendentes.
- Visualizar PDF.
- Aprovar certidão.
- Recusar e solicitar novo documento.
- Registrar data, responsável pela análise e validade.

### Denúncias

- Listar denúncias por prioridade.
- Visualizar envolvidos e contexto da conversa/atendimento.
- Assumir caso.
- Registrar decisão da moderação.
- Encerrar ou reabrir ocorrência.

### Relatórios

- Novos cadastros.
- Entrevistas realizadas.
- Avaliação média.
- Contas banidas e reativadas.
- Certidões analisadas por período.
- Exportação futura em CSV/PDF.

### Configurações

- Ativar ou desativar notificações.
- Definir se novos perfis precisam de aprovação manual.
- Configurar resumo semanal.
- Gerenciar permissões de administradores.

## Próximas integrações

A disponibilidade semanal, solicitações de entrevista e contratação, registros aceitos, conversas/mensagens e avaliações estão conectados à API e ao banco de dados. Denúncias geradas por avaliações de 1 a 3 estrelas de contratos ou entrevistas são persistidas com seus motivos e exibidas anonimamente no painel administrativo. Documentos e relatórios ainda precisam de integração completa; as funções do JavaScript devem permanecer separadas da marcação para facilitar essa evolução.
