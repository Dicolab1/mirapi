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

// // formato com url única para ser utilizado no render
// // config/multiDb.js
// const { Pool } = require('pg');
// require('dotenv').config();

// // Banco do Cliente (MIRDB) - pode usar DATABASE_URL ou variáveis separadas
// const mirdb = new Pool({
//   connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
//   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
// });

// // Banco Lexical Central (LEXICALDB)
// const lexicalDb = new Pool({
//   connectionString: process.env.LEXICAL_DATABASE_URL || `postgresql://${process.env.LEXICAL_DB_USER}:${process.env.LEXICAL_DB_PASSWORD}@${process.env.LEXICAL_DB_HOST}:${process.env.LEXICAL_DB_PORT}/${process.env.LEXICAL_DB_NAME}`,
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
//     console.error('   Verifique as variáveis de ambiente:');
//     console.error('   LEXICAL_DATABASE_URL ou LEXICAL_DB_HOST/LEXICAL_DB_USER/LEXICAL_DB_PASSWORD');
//   }
// }

// module.exports = { mirdb, lexicalDb, testarConexoes };

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
