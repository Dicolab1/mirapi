// config/multiDb.js
const { Pool } = require('pg');
require('dotenv').config();

// Banco do Cliente (MIRDB)
const mirdb = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Banco Lexical Central (LEXICALDB)
const lexicalDb = new Pool({
  host: process.env.LEXICAL_DB_HOST,
  port: process.env.LEXICAL_DB_PORT,
  user: process.env.LEXICAL_DB_USER,
  password: process.env.LEXICAL_DB_PASSWORD,
  database: process.env.LEXICAL_DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Testar conexões
async function testarConexoes() {
  try {
    await mirdb.query('SELECT NOW()');
    console.log('✅ MIRDB conectado com sucesso');
  } catch (error) {
    console.error('❌ Erro na conexão com MIRDB:', error.message);
  }
  
  try {
    await lexicalDb.query('SELECT NOW()');
    console.log('✅ LEXICALDB conectado com sucesso');
  } catch (error) {
    console.error('❌ Erro na conexão com LEXICALDB:', error.message);
  }
}

module.exports = { mirdb, lexicalDb, testarConexoes };