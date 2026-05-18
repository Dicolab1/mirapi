-- scripts/init_lexicaldb.sql
-- Execute no banco lexical central

-- Tabela de nomes
CREATE TABLE lexical_nome (
    id SERIAL PRIMARY KEY,
    token VARCHAR(10) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    frequencia INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de sobrenomes
CREATE TABLE lexical_sobrenome (
    id SERIAL PRIMARY KEY,
    token VARCHAR(10) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    frequencia INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de CEPs
CREATE TABLE lexical_cep (
    id SERIAL PRIMARY KEY,
    token VARCHAR(10) UNIQUE NOT NULL,
    valor VARCHAR(8) UNIQUE NOT NULL,
    frequencia INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de emails
CREATE TABLE lexical_email (
    id SERIAL PRIMARY KEY,
    token VARCHAR(10) UNIQUE NOT NULL,
    valor TEXT UNIQUE NOT NULL,
    frequencia INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_nome_valor ON lexical_nome(valor);
CREATE INDEX idx_sobrenome_valor ON lexical_sobrenome(valor);
CREATE INDEX idx_cep_valor ON lexical_cep(valor);
CREATE INDEX idx_email_valor ON lexical_email(valor);
