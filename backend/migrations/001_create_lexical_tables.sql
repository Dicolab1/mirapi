-- Migration 001: Criar tabelas do banco lexical (LEXICALDB)

-- Tabela de nomes
CREATE TABLE IF NOT EXISTS lexical_nome (
    id SERIAL PRIMARY KEY,
    token VARCHAR(12) UNIQUE NOT NULL,
    valor VARCHAR(100) NOT NULL,
    frequencia INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de sobrenomes
CREATE TABLE IF NOT EXISTS lexical_sobrenome (
    id SERIAL PRIMARY KEY,
    token VARCHAR(12) UNIQUE NOT NULL,
    valor VARCHAR(100) NOT NULL,
    frequencia INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de CEPs
CREATE TABLE IF NOT EXISTS lexical_cep (
    id SERIAL PRIMARY KEY,
    token VARCHAR(12) UNIQUE NOT NULL,
    valor VARCHAR(12) NOT NULL,  -- CEP pode ter traço
    frequencia INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de emails
CREATE TABLE IF NOT EXISTS lexical_email (
    id SERIAL PRIMARY KEY,
    token VARCHAR(12) UNIQUE NOT NULL,
    valor VARCHAR(200) NOT NULL,  -- Email pode ser longo
    frequencia INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lexical_nome_valor ON lexical_nome(valor);
CREATE INDEX IF NOT EXISTS idx_lexical_sobrenome_valor ON lexical_sobrenome(valor);
CREATE INDEX IF NOT EXISTS idx_lexical_cep_valor ON lexical_cep(valor);
CREATE INDEX IF NOT EXISTS idx_lexical_email_valor ON lexical_email(valor);

-- Índices para busca por token
CREATE INDEX IF NOT EXISTS idx_lexical_nome_token ON lexical_nome(token);
CREATE INDEX IF NOT EXISTS idx_lexical_sobrenome_token ON lexical_sobrenome(token);
CREATE INDEX IF NOT EXISTS idx_lexical_cep_token ON lexical_cep(token);
CREATE INDEX IF NOT EXISTS idx_lexical_email_token ON lexical_email(token);

-- Tabela de controle de migrations
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Registrar esta migration
INSERT INTO migrations (name) VALUES ('001_create_lexical_tables')
ON CONFLICT (name) DO NOTHING;