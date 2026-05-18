// formato com url única para ser utilizado no render
// config/multiDb.js
const { Pool } = require('pg');
require('dotenv').config();

// Banco do Cliente (MIRDB) - pode usar DATABASE_URL ou variáveis separadas
const mirdb = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Banco Lexical Central (LEXICALDB)
const lexicalDb = new Pool({
  connectionString: process.env.LEXICAL_DATABASE_URL || `postgresql://${process.env.LEXICAL_DB_USER}:${process.env.LEXICAL_DB_PASSWORD}@${process.env.LEXICAL_DB_HOST}:${process.env.LEXICAL_DB_PORT}/${process.env.LEXICAL_DB_NAME}`,
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
    console.error('   Verifique as variáveis de ambiente:');
    console.error('   LEXICAL_DATABASE_URL ou LEXICAL_DB_HOST/LEXICAL_DB_USER/LEXICAL_DB_PASSWORD');
  }
}

module.exports = { mirdb, lexicalDb, testarConexoes };

// formato para acesso local com variaveis separadas
// // config/multiDb.js
// const { Pool } = require('pg');
// require('dotenv').config();

// // Banco do Cliente (MIRDB)
// const mirdb = new Pool({
//   host: process.env.DB_HOST,
//   port: process.env.DB_PORT,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
// });

// // Banco Lexical Central (LEXICALDB)
// const lexicalDb = new Pool({
//   host: process.env.LEXICAL_DB_HOST,
//   port: process.env.LEXICAL_DB_PORT,
//   user: process.env.LEXICAL_DB_USER,
//   password: process.env.LEXICAL_DB_PASSWORD,
//   database: process.env.LEXICAL_DB_NAME,
//   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
// });

// // Testar conexões
// async function testarConexoes() {
//   try {
//     await mirdb.query('SELECT NOW()');
//     console.log('✅ MIRDB conectado com sucesso');
//   } catch (error) {
//     console.error('❌ Erro na conexão com MIRDB:', error.message);
//   }
  
//   try {
//     await lexicalDb.query('SELECT NOW()');
//     console.log('✅ LEXICALDB conectado com sucesso');
//   } catch (error) {
//     console.error('❌ Erro na conexão com LEXICALDB:', error.message);
//   }
// }

// module.exports = { mirdb, lexicalDb, testarConexoes };
