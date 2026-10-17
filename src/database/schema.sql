CREATE TABLE IF NOT EXISTS usuario (
    usuario_codigo CHAR(12) PRIMARY KEY,
    cpf CHAR(11) NOT NULL,
    email_1 VARCHAR(300) NOT NULL,
    email_2 VARCHAR(300),
    telefone VARCHAR(20) NOT NULL,
    nome VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS pais (
    codigo_pais CHAR(12) PRIMARY KEY,
    cpf CHAR(11) NOT NULL,
    email_1 VARCHAR(300) NOT NULL,
    email_2 VARCHAR(300),
    telefone VARCHAR(20) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    usuario_codigo CHAR(12) NOT NULL,
    FOREIGN KEY (usuario_codigo) REFERENCES usuario (usuario_codigo)
);

CREATE TABLE IF NOT EXISTS baba (
    codigo_baba CHAR(12) PRIMARY KEY,
    cpf CHAR(11) NOT NULL,
    email_1 VARCHAR(300) NOT NULL,
    email_2 VARCHAR(300),
    telefone VARCHAR(20) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    usuario_codigo CHAR(12) NOT NULL,
    status_cadastro VARCHAR(20) DEFAULT 'Ativa',
    foto TEXT,
    tarifa_hora REAL,
    estado CHAR(2),
    municipio VARCHAR(100),
    FOREIGN KEY (usuario_codigo) REFERENCES usuario (usuario_codigo)
);

CREATE TABLE IF NOT EXISTS credencial (
    usuario_codigo CHAR(12) PRIMARY KEY,
    senha_hash TEXT NOT NULL,
    FOREIGN KEY (usuario_codigo) REFERENCES usuario (usuario_codigo)
);

CREATE TABLE IF NOT EXISTS administrador (
    usuario_codigo CHAR(12) PRIMARY KEY,
    FOREIGN KEY (usuario_codigo) REFERENCES usuario (usuario_codigo)
);

CREATE TABLE IF NOT EXISTS baba_disponibilidade (
    codigo_baba CHAR(12) NOT NULL,
    dia_semana VARCHAR(10) NOT NULL,
    hora_inicio CHAR(5) NOT NULL,
    hora_fim CHAR(5) NOT NULL,
    PRIMARY KEY (codigo_baba, dia_semana),
    FOREIGN KEY (codigo_baba) REFERENCES baba (codigo_baba) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS solicitacao_entrevista (
    solicitacao_id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_pais CHAR(12) NOT NULL,
    codigo_baba CHAR(12) NOT NULL,
    data_entrevista DATE NOT NULL,
    hora_entrevista CHAR(5) NOT NULL,
    formato VARCHAR(20) NOT NULL,
    mensagem TEXT,
    criada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (codigo_pais) REFERENCES pais (codigo_pais) ON DELETE CASCADE,
    FOREIGN KEY (codigo_baba) REFERENCES baba (codigo_baba) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS entrevista (
    entrevista_id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_pais CHAR(12) NOT NULL,
    codigo_baba CHAR(12) NOT NULL,
    data_entrevista DATE NOT NULL,
    hora_entrevista CHAR(5) NOT NULL,
    formato VARCHAR(20) NOT NULL,
    mensagem TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Agendada',
    criada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (codigo_pais) REFERENCES pais (codigo_pais) ON DELETE CASCADE,
    FOREIGN KEY (codigo_baba) REFERENCES baba (codigo_baba) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS solicitacao_contrato (
    solicitacao_id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_pais CHAR(12) NOT NULL,
    codigo_baba CHAR(12) NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    horarios_json TEXT NOT NULL DEFAULT '[]',
    mensagem TEXT,
    criada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (codigo_pais) REFERENCES pais (codigo_pais) ON DELETE CASCADE,
    FOREIGN KEY (codigo_baba) REFERENCES baba (codigo_baba) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contrato (
    contrato_id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_pais CHAR(12) NOT NULL,
    codigo_baba CHAR(12) NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    horarios_json TEXT NOT NULL DEFAULT '[]',
    mensagem TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Ativo',
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (codigo_pais) REFERENCES pais (codigo_pais) ON DELETE CASCADE,
    FOREIGN KEY (codigo_baba) REFERENCES baba (codigo_baba) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS avaliacao_contrato (
    avaliacao_id INTEGER PRIMARY KEY AUTOINCREMENT,
    contrato_id INTEGER NOT NULL UNIQUE,
    codigo_pais CHAR(12) NOT NULL,
    codigo_baba CHAR(12) NOT NULL,
    nota INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
    comentario TEXT,
    motivos_json TEXT NOT NULL DEFAULT '[]',
    criada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contrato_id) REFERENCES contrato (contrato_id) ON DELETE CASCADE,
    FOREIGN KEY (codigo_pais) REFERENCES pais (codigo_pais) ON DELETE CASCADE,
    FOREIGN KEY (codigo_baba) REFERENCES baba (codigo_baba) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversa (
    conversa_id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_pais CHAR(12) NOT NULL,
    codigo_baba CHAR(12) NOT NULL,
    criada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (codigo_pais, codigo_baba),
    FOREIGN KEY (codigo_pais) REFERENCES pais (codigo_pais) ON DELETE CASCADE,
    FOREIGN KEY (codigo_baba) REFERENCES baba (codigo_baba) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mensagem (
    mensagem_id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversa_id INTEGER NOT NULL,
    remetente_usuario_codigo CHAR(12) NOT NULL,
    conteudo TEXT NOT NULL,
    enviada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversa_id) REFERENCES conversa (conversa_id) ON DELETE CASCADE,
    FOREIGN KEY (remetente_usuario_codigo) REFERENCES usuario (usuario_codigo) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS atualizar_conversa_apos_mensagem
AFTER INSERT ON mensagem
BEGIN
    UPDATE conversa SET atualizada_em = CURRENT_TIMESTAMP WHERE conversa_id = NEW.conversa_id;
END;

-- Índices de Unicidade
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_cpf ON usuario (cpf);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_email_1 ON usuario (email_1);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pais_cpf ON pais (cpf);
CREATE UNIQUE INDEX IF NOT EXISTS idx_baba_cpf ON baba (cpf);
CREATE INDEX IF NOT EXISTS idx_solicitacao_entrevista_baba ON solicitacao_entrevista (codigo_baba, criada_em);
CREATE INDEX IF NOT EXISTS idx_solicitacao_contrato_baba ON solicitacao_contrato (codigo_baba, criada_em);
CREATE INDEX IF NOT EXISTS idx_entrevista_pais ON entrevista (codigo_pais, data_entrevista);
CREATE INDEX IF NOT EXISTS idx_entrevista_baba ON entrevista (codigo_baba, data_entrevista);
CREATE INDEX IF NOT EXISTS idx_contrato_pais ON contrato (codigo_pais, data_inicio);
CREATE INDEX IF NOT EXISTS idx_contrato_baba ON contrato (codigo_baba, data_inicio);
CREATE INDEX IF NOT EXISTS idx_mensagem_conversa ON mensagem (conversa_id, mensagem_id);