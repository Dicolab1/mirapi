-- scripts/init_mirdb.sql
-- Execute no banco do cliente

-- Tabela de dados originais (referência)
CREATE TABLE pessoas_normal (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100),
    sobrenome VARCHAR(200),
    cep VARCHAR(8),
    casa VARCHAR(10),
    cpf VARCHAR(11) UNIQUE,
    email VARCHAR(100),
    cel VARCHAR(11),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela tokenizada (APENAS TOKENS!)
CREATE TABLE pessoas_mir (
    id SERIAL PRIMARY KEY,
    nome_token VARCHAR(10),
    sobrenome_token VARCHAR(10),
    cep_token VARCHAR(10),
    casa VARCHAR(10),
    cpf_token VARCHAR(10),
    email_token VARCHAR(10),
    cel_token VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para busca
CREATE INDEX idx_mir_nome ON pessoas_mir(nome_token);
CREATE INDEX idx_mir_cpf ON pessoas_mir(cpf_token);