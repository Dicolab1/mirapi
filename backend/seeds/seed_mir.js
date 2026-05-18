// seed/seed_mir.js
const path = require('path');

// Carregar .env da PASTA RAIZ
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = require('../config/db');

//--------------------------------------------------
// MASSAS DE DADOS
//--------------------------------------------------

const nomes = [
  'MARIA', 'JOSE', 'ANA', 'JOAO', 'ANTONIO', 'FRANCISCO', 'PEDRO', 'CARLOS',
  'LUCAS', 'LUIZ', 'PAULO', 'MARCOS', 'RAFAEL', 'MATEUS', 'FELIPE', 'GABRIEL',
  'ANDRE', 'RICARDO', 'BRUNO', 'EDUARDO', 'JORGE', 'SERGIO', 'RODRIGO', 'ALEXANDRE',
  'FERNANDO', 'CLAUDIO', 'MARCIO', 'ROBERTO', 'VITOR', 'DANIEL', 'GUILHERME', 'LEONARDO'
];

const sobrenomesLista = [
  'SILVA', 'SANTOS', 'OLIVEIRA', 'SOUZA', 'PEREIRA', 'FERREIRA', 'LIMA', 'ALVES',
  'RODRIGUES', 'COSTA', 'GOMES', 'MARTINS', 'ROCHA', 'RIBEIRO', 'ALMEIDA', 'CARVALHO'
];

// Domínios de email comuns
const dominiosEmail = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'bol.com.br',
  'uol.com.br', 'terra.com.br', 'ig.com.br', 'live.com', 'icloud.com'
];

// Prefixos comuns para email
const prefixosEmail = [
  'maria', 'jose', 'ana', 'joao', 'antonio', 'francisco', 'pedro', 'carlos',
  'lucas', 'luiz', 'paulo', 'marcos', 'rafael', 'mateus', 'felipe', 'gabriel',
  'contato', 'info', 'contato', 'vendas', 'suporte', 'comercial', 'financeiro'
];

const ceps = [
  '27220110', '27255120', '20040002', '27500000',
  '01001000', '30130000', '80010000', '90010000'
];

//--------------------------------------------------
// UTILITÁRIOS
//--------------------------------------------------

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function encodeBase62(numero) {
  if (numero === 0) return '0';
  let resultado = '';
  let n = numero;
  while (n > 0) {
    resultado = BASE62[n % 62] + resultado;
    n = Math.floor(n / 62);
  }
  return resultado;
}

function decodeBase62(texto) {
  let resultado = 0;
  for (let i = 0; i < texto.length; i++) {
    resultado = resultado * 62 + BASE62.indexOf(texto[i]);
  }
  return resultado;
}

function gerarCPF() {
  let numeros = '';
  for (let i = 0; i < 9; i++) {
    numeros += Math.floor(Math.random() * 10);
  }
  
  let soma1 = 0;
  for (let i = 0; i < 9; i++) {
    soma1 += parseInt(numeros[i]) * (10 - i);
  }
  let resto1 = (soma1 * 10) % 11;
  if (resto1 === 10) resto1 = 0;
  
  let soma2 = 0;
  const parcial = numeros + resto1;
  for (let i = 0; i < 10; i++) {
    soma2 += parseInt(parcial[i]) * (11 - i);
  }
  let resto2 = (soma2 * 10) % 11;
  if (resto2 === 10) resto2 = 0;
  
  return numeros + resto1 + resto2;
}

function gerarCelular() {
  const ddd = Math.floor(Math.random() * (99 - 11 + 1) + 11);
  const numero = Math.floor(Math.random() * 900000000) + 100000000;
  return `${ddd}${numero}`;
}

function gerarEmail() {
  const prefixo = prefixosEmail[Math.floor(Math.random() * prefixosEmail.length)];
  const numero = Math.floor(Math.random() * 1000);
  const dominio = dominiosEmail[Math.floor(Math.random() * dominiosEmail.length)];
  return `${prefixo}${numero}@${dominio}`;
}

function random(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

function tokenProgressivo(prefixo, numero) {
  return `${prefixo}${encodeBase62(numero)}`;
}

//--------------------------------------------------
// LIMPEZA DAS TABELAS
//--------------------------------------------------

async function limparTabelas() {
  console.log('🗑️  LIMPANDO TABELAS...');
  
  const queries = [
    'DELETE FROM pessoas_mir',
    'DELETE FROM pessoas_normal',
    'DELETE FROM lexical_nome',
    'DELETE FROM lexical_sobrenome',
    'DELETE FROM lexical_cep',
    'DELETE FROM lexical_email',
    'ALTER SEQUENCE lexical_nome_id_seq RESTART WITH 1',
    'ALTER SEQUENCE lexical_sobrenome_id_seq RESTART WITH 1',
    'ALTER SEQUENCE lexical_cep_id_seq RESTART WITH 1',
    'ALTER SEQUENCE lexical_email_id_seq RESTART WITH 1',
    'ALTER SEQUENCE pessoas_normal_id_seq RESTART WITH 1'
  ];
  
  for (const query of queries) {
    await pool.query(query);
  }
  
  console.log('✅ TABELAS LIMPAS');
}

//--------------------------------------------------
// TOKENIZAÇÃO
//--------------------------------------------------

async function obterOuCriarToken(tabela, prefixo, valor, client, contadorRef) {
  if (!valor || valor.trim() === '') return null;
  
  valor = valor.trim().toLowerCase();
  
  const busca = await client.query(
    `SELECT token FROM ${tabela} WHERE valor = $1`,
    [valor]
  );
  
  if (busca.rows.length > 0) {
    await client.query(
      `UPDATE ${tabela} SET frequencia = frequencia + 1 WHERE valor = $1`,
      [valor]
    );
    return busca.rows[0].token;
  }
  
  const token = tokenProgressivo(prefixo, contadorRef.value);
  
  await client.query(
    `INSERT INTO ${tabela} (token, valor, frequencia) VALUES ($1, $2, 1)`,
    [token, valor]
  );
  
  contadorRef.value++;
  return token;
}

//--------------------------------------------------
// POPULAR
//--------------------------------------------------

async function popular() {
  const TOTAL_REGISTROS = 100000;
  const BATCH_SIZE = 1000;
  
  console.log(`🚀 POPULANDO ${TOTAL_REGISTROS} REGISTROS MIR/MNE`);
  console.log(`📦 BATCH SIZE: ${BATCH_SIZE}`);
  console.log('\n🎯 METODOLOGIA MIR:');
  console.log('   ✅ Tokens PROGRESSIVOS: N0, S0, C0, M0...');
  console.log('   ✅ MNE para CPF e Celular (Base62)');
  console.log('   ✅ Compressão máxima\n');
  
  const startTime = Date.now();
  
  const contadores = {
    nomes: { value: 0 },
    sobrenomes: { value: 0 },
    ceps: { value: 0 },
    emails: { value: 0 }
  };
  
  for (let batch = 0; batch < TOTAL_REGISTROS / BATCH_SIZE; batch++) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (let i = 0; i < BATCH_SIZE; i++) {
        const index = batch * BATCH_SIZE + i + 1;
        if (index > TOTAL_REGISTROS) break;
        
        // Gerar dados
        const nome = random(nomes);
        const sobrenome = `${random(sobrenomesLista)} ${random(sobrenomesLista)}`;
        const email = gerarEmail();
        const celular = gerarCelular();
        const cep = random(ceps);
        const casa = Math.floor(Math.random() * 9999) + 1;
        const cpf = gerarCPF();
        
        // Inserir na tabela normal (referência)
        const normalResult = await client.query(`
          INSERT INTO pessoas_normal (nome, sobrenome, email, cel, cep, casa, cpf)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [nome, sobrenome, email, celular, cep, casa, cpf]);
        
        const pessoaId = normalResult.rows[0].id;
        
        // Tokenização (MIR)
        const nomeToken = await obterOuCriarToken('lexical_nome', 'N', nome, client, contadores.nomes);
        const sobrenomeToken = await obterOuCriarToken('lexical_sobrenome', 'S', sobrenome, client, contadores.sobrenomes);
        const cepToken = await obterOuCriarToken('lexical_cep', 'C', cep, client, contadores.ceps);
        const emailToken = await obterOuCriarToken('lexical_email', 'M', email, client, contadores.emails);
        
        // MNE (Mathematical Numeric Encoding) para CPF e Celular
        const cpfBase = cpf.substring(0, 9);
        const cpfMNE = encodeBase62(parseInt(cpfBase, 10));
        const celMNE = encodeBase62(parseInt(celular, 10));
        
        // Inserir na tabela MIR (apenas tokens + MNE)
        await client.query(`
          INSERT INTO pessoas_mir (id, nome_token, sobrenome_token, email_token, cep_token, casa, cpf_mne, cel_mne)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [pessoaId, nomeToken, sobrenomeToken, emailToken, cepToken, casa, cpfMNE, celMNE]);
        
        if (index % 5000 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`📊 ${index.toLocaleString()} registros (${elapsed}s)`);
          console.log(`   Tokens: N=${contadores.nomes.value} S=${contadores.sobrenomes.value} C=${contadores.ceps.value} M=${contadores.emails.value}`);
        }
      }
      
      await client.query('COMMIT');
      console.log(`✅ Batch ${batch + 1}/${Math.ceil(TOTAL_REGISTROS / BATCH_SIZE)} concluído`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Erro no batch ${batch + 1}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  const endTime = Date.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n🎉 FINALIZADO!');
  console.log(`⏱️  Tempo: ${totalTime}s`);
  console.log(`📈 Média: ${(TOTAL_REGISTROS / totalTime).toFixed(2)} registros/s`);
  
  await exibirEstatisticas();
  process.exit(0);
}

//--------------------------------------------------
// ESTATÍSTICAS FINAIS
//--------------------------------------------------

async function exibirEstatisticas() {
  console.log('\n📊 ESTATÍSTICAS FINAIS:');
  
  const stats = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM pessoas_normal) as normal,
      (SELECT COUNT(*) FROM pessoas_mir) as mir,
      (SELECT COUNT(*) FROM lexical_nome) as nomes,
      (SELECT COUNT(*) FROM lexical_sobrenome) as sobrenomes,
      (SELECT COUNT(*) FROM lexical_cep) as ceps,
      (SELECT COUNT(*) FROM lexical_email) as emails
  `);
  
  console.log(`📝 Normal: ${stats.rows[0].normal.toLocaleString()}`);
  console.log(`🔐 MIR: ${stats.rows[0].mir.toLocaleString()}`);
  console.log(`📚 Nomes: ${stats.rows[0].nomes}`);
  console.log(`📚 Sobrenomes: ${stats.rows[0].sobrenomes}`);
  console.log(`📚 CEPs: ${stats.rows[0].ceps}`);
  console.log(`📚 Emails: ${stats.rows[0].emails}`);
  
  // Exemplos
  const exemplos = await pool.query(`
    SELECT 'nome' as tipo, token, valor FROM lexical_nome LIMIT 3
    UNION ALL
    SELECT 'sobrenome', token, valor FROM lexical_sobrenome LIMIT 3
    UNION ALL
    SELECT 'email', token, valor FROM lexical_email LIMIT 3
  `);
  
  console.log('\n📌 EXEMPLOS DE TOKENS:');
  exemplos.rows.forEach(row => {
    console.log(`   ${row.tipo}: ${row.token} → "${row.valor}"`);
  });
}

//--------------------------------------------------
// MAIN
//--------------------------------------------------

async function main() {
  try {
    console.log('🔌 CONECTANDO AO BANCO...');
    await pool.query('SELECT NOW()');
    console.log('✅ CONEXÃO OK\n');
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('⚠️  Limpar tabelas antes de popular? (s/N): ', async (answer) => {
      if (answer.toLowerCase() === 's') await limparTabelas();
      readline.close();
      await popular();
    });
    
  } catch (error) {
    console.error('❌ ERRO:', error);
    process.exit(1);
  }
}

main();