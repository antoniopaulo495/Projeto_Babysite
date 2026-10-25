-- Contas de demonstração: use BabysiteDemo2026! como senha em todas elas.
-- Os e-mails em example.com e os demais dados são fictícios.
INSERT OR IGNORE INTO usuario (usuario_codigo, cpf, email_1, telefone, nome) VALUES
('800000000001', '10000000001', 'responsavel1@example.com', '+55 (00) 90000-0001', 'Camila Oliveira'),
('800000000002', '10000000002', 'responsavel2@example.com', '+55 (00) 90000-0002', 'Rafael Martins'),
('800000000003', '10000000003', 'responsavel3@example.com', '+55 (00) 90000-0003', 'Juliana Costa'),
('800000000004', '10000000004', 'responsavel4@example.com', '+55 (00) 90000-0004', 'Marcos Almeida'),
('800000000005', '10000000005', 'responsavel5@example.com', '+55 (00) 90000-0005', 'Beatriz Souza'),
('810000000001', '20000000001', 'baba1@example.com', '+55 (00) 91000-0001', 'Luna Ferreira'),
('810000000002', '20000000002', 'baba2@example.com', '+55 (00) 91000-0002', 'Cecilia Martins'),
('810000000003', '20000000003', 'baba3@example.com', '+55 (00) 91000-0003', 'Sofia Almeida'),
('810000000004', '20000000004', 'baba4@example.com', '+55 (00) 91000-0004', 'Helena Costa'),
('810000000005', '20000000005', 'baba5@example.com', '+55 (00) 91000-0005', 'Maya Ribeiro'),
('899000000001', '90000000001', 'admin@example.com', '+55 (00) 99000-0001', 'Administracao Babysite');

INSERT OR IGNORE INTO pais (codigo_pais, cpf, email_1, telefone, nome, usuario_codigo) VALUES
('PAI200000001', '10000000001', 'responsavel1@example.com', '+55 (00) 90000-0001', 'Camila Oliveira', '800000000001'),
('PAI200000002', '10000000002', 'responsavel2@example.com', '+55 (00) 90000-0002', 'Rafael Martins', '800000000002'),
('PAI200000003', '10000000003', 'responsavel3@example.com', '+55 (00) 90000-0003', 'Juliana Costa', '800000000003'),
('PAI200000004', '10000000004', 'responsavel4@example.com', '+55 (00) 90000-0004', 'Marcos Almeida', '800000000004'),
('PAI200000005', '10000000005', 'responsavel5@example.com', '+55 (00) 90000-0005', 'Beatriz Souza', '800000000005');

INSERT OR IGNORE INTO baba (
    codigo_baba, cpf, email_1, telefone, nome, usuario_codigo, status_cadastro,
    tarifa_hora, estado, municipio
) VALUES
('BAB100000001', '20000000001', 'baba1@example.com', '+55 (00) 91000-0001', 'Luna Ferreira', '810000000001', 'Ativa', 35.00, 'ESTADO_1', 'municipio_1'),
('BAB100000002', '20000000002', 'baba2@example.com', '+55 (00) 91000-0002', 'Cecilia Martins', '810000000002', 'Ativa', 40.00, 'ESTADO_2', 'municipio_2'),
('BAB100000003', '20000000003', 'baba3@example.com', '+55 (00) 91000-0003', 'Sofia Almeida', '810000000003', 'Ativa', 45.00, 'ESTADO_3', 'municipio_3'),
('BAB100000004', '20000000004', 'baba4@example.com', '+55 (00) 91000-0004', 'Helena Costa', '810000000004', 'Ativa', 50.00, 'ESTADO_4', 'municipio_4'),
('BAB100000005', '20000000005', 'baba5@example.com', '+55 (00) 91000-0005', 'Maya Ribeiro', '810000000005', 'Ativa', 38.00, 'ESTADO_5', 'municipio_5');

INSERT OR IGNORE INTO baba_disponibilidade (codigo_baba, dia_semana, hora_inicio, hora_fim) VALUES
('BAB100000001', 'segunda', '08:00', '17:00'),
('BAB100000001', 'quarta', '08:00', '17:00'),
('BAB100000002', 'terca', '09:00', '18:00'),
('BAB100000002', 'quinta', '09:00', '18:00'),
('BAB100000003', 'segunda', '07:00', '16:00'),
('BAB100000003', 'sexta', '07:00', '16:00'),
('BAB100000004', 'quarta', '10:00', '19:00'),
('BAB100000004', 'sabado', '08:00', '14:00'),
('BAB100000005', 'terca', '08:00', '17:00'),
('BAB100000005', 'quinta', '08:00', '17:00');

UPDATE baba SET formas_pagamento = '["pix","dinheiro"]' WHERE codigo_baba = 'BAB100000001';
UPDATE baba SET formas_pagamento = '["pix","cartao"]' WHERE codigo_baba = 'BAB100000002';
UPDATE baba SET formas_pagamento = '["dinheiro","cartao"]' WHERE codigo_baba = 'BAB100000003';
UPDATE baba SET tarifa_hora = NULL, tarifa_negociavel = 1,
    formas_pagamento = '["pix"]' WHERE codigo_baba = 'BAB100000004';
UPDATE baba SET formas_pagamento = '["pix","dinheiro","cartao"]' WHERE codigo_baba = 'BAB100000005';
UPDATE baba SET diploma_status = 'Aprovada'
WHERE codigo_baba IN ('BAB100000001', 'BAB100000002', 'BAB100000003', 'BAB100000004', 'BAB100000005');

INSERT INTO contrato (
    codigo_pais, codigo_baba, data_inicio, data_fim, horarios_json,
    tarifa_hora, pagamento_status, mensagem, status
)
SELECT 'PAI200000001', 'BAB100000001',
    date('now', 'weekday 1', '-28 days'), date('now', 'weekday 1', '-15 days'),
    '[{"dia_semana":"segunda","hora_inicio":"08:00","hora_fim":"12:00"},{"dia_semana":"quarta","hora_inicio":"08:00","hora_fim":"12:00"}]',
    35.00, 'Pendente', 'Contrato de demonstração de pagamento', 'Concluído'
WHERE NOT EXISTS (
    SELECT 1 FROM contrato
    WHERE codigo_pais = 'PAI200000001' AND codigo_baba = 'BAB100000001'
      AND mensagem = 'Contrato de demonstração de pagamento'
);

INSERT INTO contrato (
    codigo_pais, codigo_baba, data_inicio, data_fim, horarios_json,
    tarifa_hora, pagamento_status, pago_em, mensagem, status
)
SELECT 'PAI200000002', 'BAB100000002',
    date('now', 'weekday 2', '-28 days'), date('now', 'weekday 2', '-15 days'),
    '[{"dia_semana":"terca","hora_inicio":"09:00","hora_fim":"13:00"},{"dia_semana":"quinta","hora_inicio":"09:00","hora_fim":"13:00"}]',
    40.00, 'Pago', CURRENT_TIMESTAMP, 'Contrato de demonstração de pagamento', 'Concluído'
WHERE NOT EXISTS (
    SELECT 1 FROM contrato
    WHERE codigo_pais = 'PAI200000002' AND codigo_baba = 'BAB100000002'
      AND mensagem = 'Contrato de demonstração de pagamento'
);

INSERT OR IGNORE INTO administrador (usuario_codigo) VALUES ('899000000001');

INSERT OR IGNORE INTO credencial (usuario_codigo, senha_hash) VALUES
('800000000001', 'babysite-demo-seed-2026:7aa0e253bdced10042378a4d5ed58802378273caf415cf2927f6a41eb17ef45d90100e761e44b71e40d02033d258f306a5c44eb4d6b7dda300bff790b5658d63'),
('800000000002', 'babysite-demo-seed-2026:7aa0e253bdced10042378a4d5ed58802378273caf415cf2927f6a41eb17ef45d90100e761e44b71e40d02033d258f306a5c44eb4d6b7dda300bff790b5658d63'),
('800000000003', 'babysite-demo-seed-2026:7aa0e253bdced10042378a4d5ed58802378273caf415cf2927f6a41eb17ef45d90100e761e44b71e40d02033d258f306a5c44eb4d6b7dda300bff790b5658d63'),
('800000000004', 'babysite-demo-seed-2026:7aa0e253bdced10042378a4d5ed58802378273caf415cf2927f6a41eb17ef45d90100e761e44b71e40d02033d258f306a5c44eb4d6b7dda300bff790b5658d63'),
('800000000005', 'babysite-demo-seed-2026:7aa0e253bdced10042378a4d5ed58802378273caf415cf2927f6a41eb17ef45d90100e761e44b71e40d02033d258f306a5c44eb4d6b7dda300bff790b5658d63'),
('810000000001', 'babysite-demo-seed-2026:7aa0e253bdced10042378a4d5ed58802378273caf415cf2927f6a41eb17ef45d90100e761e44b71e40d02033d258f306a5c44eb4d6b7dda300bff790b5658d63'),
('810000000002', 'babysite-demo-seed-2026:7aa0e253bdced10042378a4d5ed58802378273caf415cf2927f6a41eb17ef45d90100e761e44b71e40d02033d258f306a5c44eb4d6b7dda300bff790b5658d63'),
('810000000003', 'babysite-demo-seed-2026:7aa0e253bdced10042378a4d5ed58802378273caf415cf2927f6a41eb17ef45d90100e761e44b71e40d02033d258f306a5c44eb4d6b7dda300bff790b5658d63'),
('810000000004', 'babysite-demo-seed-2026:7aa0e253bdced10042378a4d5ed58802378273caf415cf2927f6a41eb17ef45d90100e761e44b71e40d02033d258f306a5c44eb4d6b7dda300bff790b5658d63'),
('810000000005', 'babysite-demo-seed-2026:7aa0e253bdced10042378a4d5ed58802378273caf415cf2927f6a41eb17ef45d90100e761e44b71e40d02033d258f306a5c44eb4d6b7dda300bff790b5658d63'),
('899000000001', 'babysite-demo-seed-2026:7aa0e253bdced10042378a4d5ed58802378273caf415cf2927f6a41eb17ef45d90100e761e44b71e40d02033d258f306a5c44eb4d6b7dda300bff790b5658d63');
