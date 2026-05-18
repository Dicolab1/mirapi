// config/migrations.js
const fs = require('fs');
const path = require('path');
const { mirdb, lexicalDb } = require('./multiDb');

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

// Lista de migrations em ordem (apenas as duas primeiras)
const migrations = [
  { name: '001_create_lexical_tables.sql', banco: lexicalDb, dbName: 'LEXICALDB' },
  { name: '002_create_mir_tables.sql', banco: mirdb, dbName: 'MIRDB' }
];

async function executarMigration(banco, sqlFile, dbName) {
  console.log(`📦 Executando migration: ${sqlFile} (${dbName})`);
  
  const sqlPath = path.join(MIGRATIONS_DIR, sqlFile);
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  
  try {
    await banco.query(sql);
    console.log(`✅ Migration concluída: ${sqlFile}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro na migration ${sqlFile}:`, error.message);
    return false;
  }
}

async function verificarMigrationExecutada(banco, migrationName) {
  try {
    const result = await banco.query(
      'SELECT EXISTS (SELECT 1 FROM migrations WHERE name = $1) as executada',
      [migrationName]
    );
    return result.rows[0].executada;
  } catch (error) {
    return false; // Tabela migrations não existe ainda
  }
}

async function runMigrations() {
  console.log('\n🔄 VERIFICANDO MIGRATIONS...');
  console.log('═'.repeat(50));
  
  for (const migration of migrations) {
    const executada = await verificarMigrationExecutada(migration.banco, migration.name.replace('.sql', ''));
    
    if (!executada) {
      console.log(`\n📌 Migration pendente: ${migration.name}`);
      await executarMigration(migration.banco, migration.name, migration.dbName);
    } else {
      console.log(`⏭️ Migration já executada: ${migration.name}`);
    }
  }
  
  console.log('\n✅ TODAS AS MIGRATIONS VERIFICADAS!');
  console.log('═'.repeat(50));
}

async function verificarTabelaExiste(banco, tabela) {
  try {
    const result = await banco.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      ) as existe
    `, [tabela]);
    return result.rows[0].existe;
  } catch {
    return false;
  }
}

async function verificarEstrutura() {
  console.log('\n🔍 VERIFICANDO ESTRUTURA DO BANCO...');
  
  // Verificar tabelas no LEXICALDB
  const tabelasLexical = ['lexical_nome', 'lexical_sobrenome', 'lexical_cep', 'lexical_email'];
  for (const tabela of tabelasLexical) {
    const existe = await verificarTabelaExiste(lexicalDb, tabela);
    console.log(`   📚 ${tabela}: ${existe ? '✅' : '❌'}`);
  }
  
  // Verificar tabelas no MIRDB
  const tabelasMir = ['pessoas_normal', 'pessoas_mir'];
  for (const tabela of tabelasMir) {
    const existe = await verificarTabelaExiste(mirdb, tabela);
    console.log(`   💾 ${tabela}: ${existe ? '✅' : '❌'}`);
  }
  
  console.log('═'.repeat(50));
}

module.exports = { runMigrations, verificarEstrutura };