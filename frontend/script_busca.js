// script_busca.js - Para testar via linha de comando
// Execute: node script_busca.js

const { mirdb, lexicalDb } = require('./backend/config/multiDb');
const { reconstruirValor } = require('./backend/services/token.service');
const { reconstruirSobrenome } = require('./backend/services/mir.service');
const { formatarCPF, formatarCelular, compactarCPF } = require('./backend/services/mne.service');

async function buscarPorTermo(termo, tipo = 'todos') {
  console.log(`\n🔍 BUSCANDO: "${termo}" (tipo: ${tipo})`);
  console.log('═'.repeat(60));
  
  const startTime = Date.now();
  
  try {
    const termoBusca = `%${termo.toLowerCase()}%`;
    let registros = [];
    
    if (tipo === 'nome') {
      // Buscar tokens de nome
      const nomesTokens = await lexicalDb.query(
        `SELECT token FROM lexical_nome WHERE LOWER(valor) LIKE $1`,
        [termoBusca]
      );
      
      const tokens = nomesTokens.rows.map(r => r.token);
      if (tokens.length === 0) {
        console.log('❌ Nenhum registro encontrado');
        return;
      }
      
      const result = await mirdb.query(
        `SELECT * FROM pessoas_mir WHERE nome_token = ANY($1::varchar[]) ORDER BY id DESC`,
        [tokens]
      );
      registros = result.rows;
      
    } else if (tipo === 'email') {
      const emailToken = await lexicalDb.query(
        `SELECT token FROM lexical_email WHERE LOWER(valor) LIKE $1`,
        [termoBusca]
      );
      
      if (emailToken.rows.length === 0) {
        console.log('❌ Nenhum registro encontrado');
        return;
      }
      
      const result = await mirdb.query(
        `SELECT * FROM pessoas_mir WHERE email_token = $1 ORDER BY id DESC`,
        [emailToken.rows[0].token]
      );
      registros = result.rows;
      
    } else if (tipo === 'cpf') {
      const cpfLimpo = termo.replace(/\D/g, '');
      if (cpfLimpo.length !== 11) {
        console.log('❌ CPF inválido');
        return;
      }
      
      const cpfMNE = compactarCPF(cpfLimpo);
      const result = await mirdb.query(
        `SELECT * FROM pessoas_mir WHERE cpf_mne = $1 ORDER BY id DESC`,
        [cpfMNE]
      );
      registros = result.rows;
      
    } else {
      // Busca geral
      const [nomesTokens, emailsTokens] = await Promise.all([
        lexicalDb.query(`SELECT token FROM lexical_nome WHERE LOWER(valor) LIKE $1`, [termoBusca]),
        lexicalDb.query(`SELECT token FROM lexical_email WHERE LOWER(valor) LIKE $1`, [termoBusca])
      ]);
      
      const tokens = [...nomesTokens.rows.map(r => r.token), ...emailsTokens.rows.map(r => r.token)];
      
      if (tokens.length === 0) {
        console.log('❌ Nenhum registro encontrado');
        return;
      }
      
      const result = await mirdb.query(
        `SELECT * FROM pessoas_mir WHERE nome_token = ANY($1::varchar[]) OR email_token = ANY($1::varchar[]) ORDER BY id DESC`,
        [tokens]
      );
      registros = result.rows;
    }
    
    if (registros.length === 0) {
      console.log('❌ Nenhum registro encontrado');
      return;
    }
    
    console.log(`✅ Encontrados ${registros.length} registro(s)`);
    console.log('═'.repeat(60));
    
    for (const pessoa of registros) {
      const nome = await reconstruirValor('lexical_nome', pessoa.nome_token);
      const sobrenome = await reconstruirSobrenome(pessoa.sobrenome_token);
      const email = await reconstruirValor('lexical_email', pessoa.email_token);
      const cep = await reconstruirValor('lexical_cep', pessoa.cep_token);
      const cpfFormatado = formatarCPF(pessoa.cpf_mne);
      const celFormatado = formatarCelular(pessoa.cel_mne);
      
      console.log(`\n📋 ID: ${pessoa.id}`);
      console.log(`   Nome: ${nome} ${sobrenome}`);
      console.log(`   Email: ${email}`);
      console.log(`   Celular: ${celFormatado}`);
      console.log(`   CEP: ${cep} - Nº ${pessoa.casa}`);
      console.log(`   CPF: ${cpfFormatado}`);
      console.log('─'.repeat(40));
    }
    
    console.log(`\n⏱️ Tempo: ${Date.now() - startTime} ms`);
    
  } catch (error) {
    console.error('❌ Erro na busca:', error.message);
  }
}

// ============================================================
// INTERFACE INTERATIVA
// ============================================================
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

function menu() {
  console.log('\n' + '═'.repeat(60));
  console.log('🔍 SISTEMA DE BUSCA AVANÇADA MIR/MNE');
  console.log('═'.repeat(60));
  console.log('1️⃣ Buscar por NOME');
  console.log('2️⃣ Buscar por EMAIL');
  console.log('3️⃣ Buscar por CPF');
  console.log('4️⃣ Busca GERAL (nome ou email)');
  console.log('0️⃣ Sair');
  console.log('═'.repeat(60));
  
  readline.question('Escolha uma opção: ', async (opcao) => {
    if (opcao === '0') {
      console.log('👋 Saindo...');
      readline.close();
      process.exit(0);
    }
    
    let tipo = 'todos';
    let promptMsg = 'Digite o termo para buscar: ';
    
    if (opcao === '1') {
      tipo = 'nome';
      promptMsg = 'Digite o NOME para buscar: ';
    } else if (opcao === '2') {
      tipo = 'email';
      promptMsg = 'Digite o EMAIL para buscar: ';
    } else if (opcao === '3') {
      tipo = 'cpf';
      promptMsg = 'Digite o CPF para buscar: ';
    } else if (opcao === '4') {
      tipo = 'todos';
      promptMsg = 'Digite o termo para busca geral: ';
    } else {
      console.log('❌ Opção inválida!');
      return menu();
    }
    
    readline.question(promptMsg, async (termo) => {
      if (termo && termo.trim()) {
        await buscarPorTermo(termo.trim(), tipo);
      } else {
        console.log('❌ Termo de busca vazio!');
      }
      menu();
    });
  });
}

// Iniciar
console.log('\n🚀 Conectando aos bancos...');
Promise.all([
  mirdb.query('SELECT NOW()'),
  lexicalDb.query('SELECT NOW()')
]).then(() => {
  console.log('✅ Conectado com sucesso!');
  menu();
}).catch(err => {
  console.error('❌ Erro de conexão:', err.message);
  process.exit(1);
});