// server.js
const express = require('express');
const cors = require('cors');
const path = require('node:path');
const { mirdb, lexicalDb, testarConexoes } = require('./config/multiDb');
const { runMigrations, verificarEstrutura } = require('./config/migrations');

require('dotenv').config();

const cadastroRoutes = require('./routes/cadastro.routes');
const listarRoutes = require('./routes/listar.routes');
const estatisticasRoutes = require('./routes/estatisticas.routes');
const excluirRoutes = require('./routes/excluir.routes');
// Adicionar no server.js, junto com as outras rotas
const consultaRoutes = require('./routes/consulta.routes');

const app = express();

app.disable('x-powered-by');

const allowedOrigins = new Set([
  'http://localhost:3000',
  'https://mirapi-1.onrender.com/'
]);

app.use(cors({
  origin: function (origin, callback) {

    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origem não permitida pelo CORS'));
  }
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ============================================================
// ROTAS PRINCIPAIS
// ============================================================
app.use('/cadastro', cadastroRoutes);
app.use('/listar', listarRoutes);
app.use('/estatisticas', estatisticasRoutes);
app.use('/excluir', excluirRoutes);
app.use('/consulta', consultaRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ============================================================
// 🔒 ENDPOINT SEGURO DE LIMPEZA - LIMPA TODAS AS TABELAS
// ============================================================
app.post('/admin/limpar', async (req, res) => {
  const { senha } = req.body;
  const chaveSecreta = process.env.ADMIN_CLEAN_KEY;

  if (!chaveSecreta) {
    console.error('❌ ADMIN_CLEAN_KEY não configurada no .env');
    return res.status(500).json({
      erro: 'Sistema de limpeza não configurado. Contate o administrador.'
    });
  }

  if (senha !== chaveSecreta) {
    return res.status(403).json({
      erro: 'Senha de administrador inválida. Acesso negado.'
    });
  }

  const client = await mirdb.connect();

  try {
    console.log('⚠️ INICIANDO LIMPEZA TOTAL DO BANCO DE DADOS...');
    console.log(`👤 Autorizado por: ${req.ip} em ${new Date().toISOString()}`);

    await client.query('BEGIN');

    // Contar registros antes da limpeza
    const statsAntes = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM pessoas_normal) as pessoas_normal,
        (SELECT COUNT(*) FROM pessoas_mir) as pessoas_mir
    `);

    const lexicalStats = await lexicalDb.query(`
      SELECT 
        (SELECT COUNT(*) FROM lexical_nome) as lexical_nome,
        (SELECT COUNT(*) FROM lexical_sobrenome) as lexical_sobrenome,
        (SELECT COUNT(*) FROM lexical_cep) as lexical_cep,
        (SELECT COUNT(*) FROM lexical_email) as lexical_email
    `);

    // Limpar MIRDB
    await client.query('TRUNCATE TABLE pessoas_mir CASCADE');
    await client.query('TRUNCATE TABLE pessoas_normal CASCADE');
    await client.query("SELECT setval('pessoas_normal_id_seq', 1, false)");

    // Limpar LEXICALDB
    await lexicalDb.query('TRUNCATE TABLE lexical_nome CASCADE');
    await lexicalDb.query('TRUNCATE TABLE lexical_sobrenome CASCADE');
    await lexicalDb.query('TRUNCATE TABLE lexical_cep CASCADE');
    await lexicalDb.query('TRUNCATE TABLE lexical_email CASCADE');
    
    await lexicalDb.query("SELECT setval('lexical_nome_id_seq', 1, false)");
    await lexicalDb.query("SELECT setval('lexical_sobrenome_id_seq', 1, false)");
    await lexicalDb.query("SELECT setval('lexical_cep_id_seq', 1, false)");
    await lexicalDb.query("SELECT setval('lexical_email_id_seq', 1, false)");

    await client.query('COMMIT');

    const registrosRemovidos = {
      pessoas_normal: Number.parseInt(statsAntes.rows[0].pessoas_normal || 0),
      pessoas_mir: Number.parseInt(statsAntes.rows[0].pessoas_mir || 0),
      lexical_nome: Number.parseInt(lexicalStats.rows[0].lexical_nome || 0),
      lexical_sobrenome: Number.parseInt(lexicalStats.rows[0].lexical_sobrenome || 0),
      lexical_cep: Number.parseInt(lexicalStats.rows[0].lexical_cep || 0),
      lexical_email: Number.parseInt(lexicalStats.rows[0].lexical_email || 0)
    };

    console.log('✅ LIMPEZA TOTAL CONCLUÍDA!');
    res.json({
      sucesso: true,
      mensagem: 'Todas as tabelas foram limpas com sucesso!',
      registrosRemovidos,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na limpeza:', error);
    res.status(500).json({ erro: error.message });
  } finally {
    client.release();
  }
});

// ============================================================
// 🌱 ENDPOINT SEGURO PARA POPULAR TABELAS (SEED)
// ============================================================
app.post('/admin/seed', async (req, res) => {
  const { senha, quantidade = 100 } = req.body;
  const chaveSecreta = process.env.ADMIN_CLEAN_KEY;

  if (!chaveSecreta || senha !== chaveSecreta) {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }

  if (quantidade > 10000) {
    return res.status(400).json({ erro: 'Máximo 10.000 registros por vez.' });
  }

  const client = await mirdb.connect();

  try {
    console.log(`🌱 POPULANDO ${quantidade} REGISTROS...`);

    await client.query('BEGIN');

    const nomes = [
      'MARIA', 'JOSE', 'ANA', 'JOAO', 'ANTONIO', 'FRANCISCO', 'PEDRO', 'CARLOS',
      'LUCAS', 'LUIZ', 'PAULO', 'MARCOS', 'RAFAEL', 'MATEUS', 'FELIPE', 'GABRIEL'
    ];

    const sobrenomesLista = [
      'SILVA', 'SANTOS', 'OLIVEIRA', 'SOUZA', 'PEREIRA', 'FERREIRA', 'LIMA', 'ALVES'
    ];

    const dominiosEmail = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com'];
    const ceps = ['27220110', '27255120', '20040002', '27500000'];

    const random = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const encodeBase62 = (numero) => {
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      if (numero === 0) return '0';
      let resultado = '';
      let n = numero;
      while (n > 0) {
        resultado = chars[n % 62] + resultado;
        n = Math.floor(n / 62);
      }
      return resultado;
    };

    const gerarCPF = () => {
      let numeros = '';
      for (let i = 0; i < 9; i++) numeros += Math.floor(Math.random() * 10);
      let soma1 = 0;
      for (let i = 0; i < 9; i++) soma1 += Number.parseInt(numeros[i]) * (10 - i);
      let resto1 = (soma1 * 10) % 11;
      if (resto1 === 10) resto1 = 0;
      let soma2 = 0;
      const parcial = numeros + resto1;
      for (let i = 0; i < 10; i++) soma2 += Number.parseInt(parcial[i]) * (11 - i);
      let resto2 = (soma2 * 10) % 11;
      if (resto2 === 10) resto2 = 0;
      return numeros + resto1 + resto2;
    };

    const obterOuCriarToken = async (tabela, prefixo, valor, contadores) => {
      if (!valor) return null;
      valor = valor.trim().toUpperCase();

      const busca = await lexicalDb.query(
        `SELECT token FROM ${tabela} WHERE valor = $1`,
        [valor]
      );

      if (busca.rows.length > 0) return busca.rows[0].token;

      const token = `${prefixo}${encodeBase62(contadores[tabela])}`;
      await lexicalDb.query(
        `INSERT INTO ${tabela} (token, valor, frequencia) VALUES ($1, $2, 1)`,
        [token, valor]
      );

      contadores[tabela]++;
      return token;
    };

    const contadores = {
      lexical_nome: (await lexicalDb.query('SELECT COUNT(*) FROM lexical_nome')).rows[0].count,
      lexical_sobrenome: (await lexicalDb.query('SELECT COUNT(*) FROM lexical_sobrenome')).rows[0].count,
      lexical_cep: (await lexicalDb.query('SELECT COUNT(*) FROM lexical_cep')).rows[0].count,
      lexical_email: (await lexicalDb.query('SELECT COUNT(*) FROM lexical_email')).rows[0].count
    };

    let inseridos = 0;

    for (let i = 0; i < quantidade; i++) {
      const nome = random(nomes);
      const sobrenome = `${random(sobrenomesLista)} ${random(sobrenomesLista)}`;
      const email = `${nome.toLowerCase()}.${Math.floor(Math.random() * 1000)}@${random(dominiosEmail)}`;
      const celular = `11${Math.floor(Math.random() * 900000000) + 100000000}`;
      const cep = random(ceps);
      const casa = Math.floor(Math.random() * 9999) + 1;
      const cpf = gerarCPF();

      const normalResult = await client.query(`
        INSERT INTO pessoas_normal (nome, sobrenome, email, cel, cep, casa, cpf)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
      `, [nome, sobrenome, email, celular, cep, casa, cpf]);

      const pessoaId = normalResult.rows[0].id;

      const nomeToken = await obterOuCriarToken('lexical_nome', 'N', nome, contadores);
      const sobrenomeToken = await obterOuCriarToken('lexical_sobrenome', 'S', sobrenome, contadores);
      const emailToken = await obterOuCriarToken('lexical_email', 'M', email, contadores);
      const cepToken = await obterOuCriarToken('lexical_cep', 'C', cep, contadores);

      const cpfBase = cpf.substring(0, 9);
      const cpfMNE = encodeBase62(Number.parseInt(cpfBase, 10));
      const celMNE = encodeBase62(Number.parseInt(celular, 10));

      await client.query(`
        INSERT INTO pessoas_mir (id, nome_token, sobrenome_token, email_token, cep_token, casa, cpf_mne, cel_mne)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [pessoaId, nomeToken, sobrenomeToken, emailToken, cepToken, casa, cpfMNE, celMNE]);

      inseridos++;

      if (inseridos % 100 === 0) console.log(`   ${inseridos} registros...`);
    }

    await client.query('COMMIT');
    console.log(`✅ ${inseridos} registros inseridos!`);

    res.json({ sucesso: true, mensagem: `${inseridos} registros inseridos!` });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', error);
    res.status(500).json({ erro: error.message });
  } finally {
    client.release();
  }
});

// ============================================================
// 📊 ENDPOINT DE ESTATÍSTICAS COMPLETO
// ============================================================
app.get('/estatisticas', async (req, res) => {
  try {
    const normalCount = await mirdb.query('SELECT COUNT(*) FROM pessoas_normal');
    const mirCount = await mirdb.query('SELECT COUNT(*) FROM pessoas_mir');
    
    const tokensCount = await lexicalDb.query(`
      SELECT 
        (SELECT COUNT(*) FROM lexical_nome) as nomes,
        (SELECT COUNT(*) FROM lexical_sobrenome) as sobrenomes,
        (SELECT COUNT(*) FROM lexical_cep) as ceps,
        (SELECT COUNT(*) FROM lexical_email) as emails
    `);

    const totalRegistros = Number.parseInt(normalCount.rows[0].count);
    
    // Estimativa de bytes (simplificada)
    const normalBytes = totalRegistros * 105;  // ~105 bytes por registro tradicional
    const mirBytes = totalRegistros * 25;      // ~25 bytes por registro MIR
    
    const totalTokens = 
      Number.parseInt(tokensCount.rows[0].nomes || 0) +
      Number.parseInt(tokensCount.rows[0].sobrenomes || 0) +
      Number.parseInt(tokensCount.rows[0].ceps || 0) +
      Number.parseInt(tokensCount.rows[0].emails || 0);
    
    const lexicalBytes = totalTokens * 50;
    const totalMirBytes = mirBytes + lexicalBytes;
    const economia = normalBytes > 0 ? ((normalBytes - totalMirBytes) / normalBytes * 100).toFixed(2) : 0;

    res.json({
      normal: totalRegistros,
      mir: totalRegistros,
      normal_bytes: normalBytes,
      mir_bytes: mirBytes,
      lexical_bytes: lexicalBytes,
      total_mir: totalMirBytes,
      economia_percentual: parseFloat(economia)
    });

  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ erro: error.message });
  }
});

// ============================================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================================
const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
  try {
    console.log('\n🚀 INICIANDO SERVIDOR MIR/MNE');
    console.log('═'.repeat(50));
    
    await testarConexoes();
    await runMigrations();
    await verificarEstrutura();
    
    app.listen(PORT, () => {
      console.log(`\n🌐 Servidor rodando na porta ${PORT}`);
      console.log(`📊 Arquitetura Multi-banco ativa:`);
      console.log(`   📚 LEXICALDB → Tokens centralizados`);
      console.log(`   💾 MIRDB → Apenas tokens do cliente`);
      console.log(`\n✅ Pronto para receber requisições!\n`);
    });
    
  } catch (error) {
    console.error('❌ Falha ao iniciar servidor:', error);
    process.exit(1);
  }
}

iniciarServidor();
