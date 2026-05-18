// config/multiDb.js
const { Pool } = require('pg');
require('dotenv').config();

// Função para criar pool com tratamento de erro
function criarPool(config, nome) {
  console.log(`📡 Configurando ${nome}...`);
  return new Pool(config);
}

// Banco do Cliente (MIRDB)
const mirdbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Se não tiver DATABASE_URL, usa variáveis separadas
if (!mirdbConfig.connectionString && process.env.DB_HOST) {
  mirdbConfig.host = process.env.DB_HOST;
  mirdbConfig.port = process.env.DB_PORT || 5432;
  mirdbConfig.user = process.env.DB_USER;
  mirdbConfig.password = process.env.DB_PASSWORD;
  mirdbConfig.database = process.env.DB_NAME;
}

const mirdb = criarPool(mirdbConfig, 'MIRDB');

// Banco Lexical Central (LEXICALDB)
const lexicalDbConfig = {
  connectionString: process.env.LEXICAL_DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Se não tiver LEXICAL_DATABASE_URL, usa variáveis separadas
if (!lexicalDbConfig.connectionString && process.env.LEXICAL_DB_HOST) {
  lexicalDbConfig.host = process.env.LEXICAL_DB_HOST;
  lexicalDbConfig.port = process.env.LEXICAL_DB_PORT || 5432;
  lexicalDbConfig.user = process.env.LEXICAL_DB_USER;
  lexicalDbConfig.password = process.env.LEXICAL_DB_PASSWORD;
  lexicalDbConfig.database = process.env.LEXICAL_DB_NAME;
}

const lexicalDb = criarPool(lexicalDbConfig, 'LEXICALDB');

// Testar conexões
async function testarConexoes() {
  console.log('\n🔌 TESTANDO CONEXÕES...');
  
  // Testar MIRDB
  try {
    await mirdb.query('SELECT NOW()');
    console.log('✅ MIRDB conectado com sucesso');
  } catch (error) {
    console.error('❌ Erro na conexão com MIRDB:', error.message);
    console.error('   Verifique DATABASE_URL ou DB_HOST/DB_USER/DB_PASSWORD');
  }
  
  // Testar LEXICALDB
  try {
    await lexicalDb.query('SELECT NOW()');
    console.log('✅ LEXICALDB conectado com sucesso');
  } catch (error) {
    console.error('❌ Erro na conexão com LEXICALDB:', error.message);
    console.error('   Verifique LEXICAL_DATABASE_URL ou LEXICAL_DB_HOST/LEXICAL_DB_USER/LEXICAL_DB_PASSWORD');
    
    // Mostrar configuração atual (sem a senha)
    const config = lexicalDbConfig.connectionString 
      ? { connectionString: lexicalDbConfig.connectionString.replace(/:[^:@]*@/, ':****@') }
      : { 
          host: lexicalDbConfig.host, 
          port: lexicalDbConfig.port, 
          user: lexicalDbConfig.user,
          database: lexicalDbConfig.database 
        };
    console.error('   Configuração atual:', JSON.stringify(config, null, 2));
  }
}

module.exports = { mirdb, lexicalDb, testarConexoes };
