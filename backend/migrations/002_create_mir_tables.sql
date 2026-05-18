-- Migration 002: Criar tabelas do banco do cliente (MIRDB)

-- Tabela de dados originais (referência)
CREATE TABLE IF NOT EXISTS pessoas_normal (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100),
    sobrenome VARCHAR(200),
    email VARCHAR(200),
    cel VARCHAR(20),
    cep VARCHAR(12),
    casa VARCHAR(10),
    cpf VARCHAR(14) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela tokenizada (MIR + MNE)
CREATE TABLE IF NOT EXISTS pessoas_mir (
    id SERIAL PRIMARY KEY,
    nome_token VARCHAR(12),
    sobrenome_token VARCHAR(50),
    email_token VARCHAR(12),
    cep_token VARCHAR(12),
    casa VARCHAR(10),
    cpf_mne VARCHAR(8),
    cel_mne VARCHAR(8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para busca
CREATE INDEX IF NOT EXISTS idx_mir_nome_token ON pessoas_mir(nome_token);
CREATE INDEX IF NOT EXISTS idx_mir_sobrenome_token ON pessoas_mir(sobrenome_token);
CREATE INDEX IF NOT EXISTS idx_mir_cpf_mne ON pessoas_mir(cpf_mne);
CREATE INDEX IF NOT EXISTS idx_mir_email_token ON pessoas_mir(email_token);
CREATE INDEX IF NOT EXISTS idx_mir_created_at ON pessoas_mir(created_at);

-- Tabela de controle de migrations (se não existir)
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Registrar esta migration
INSERT INTO migrations (name) VALUES ('002_create_mir_tables')
ON CONFLICT (name) DO NOTHING;