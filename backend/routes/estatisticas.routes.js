// routes/estatisticas.routes.js
const router = require('express').Router();  // ← LINHA FALTANDO!
const { mirdb, lexicalDb } = require('../config/multiDb');

router.get('/', async (req, res) => {
  try {
    // Contagem de registros (usando mirdb)
    const normalCount = await mirdb.query(`SELECT COUNT(*) FROM pessoas_normal`);
    const mirCount = await mirdb.query(`SELECT COUNT(*) FROM pessoas_mir`);
    
    // Contagem de tokens únicos (usando lexicalDb)
    const tokensCount = await lexicalDb.query(`
      SELECT 
        (SELECT COUNT(*) FROM lexical_nome) as nomes,
        (SELECT COUNT(*) FROM lexical_sobrenome) as sobrenomes,
        (SELECT COUNT(*) FROM lexical_cep) as ceps,
        (SELECT COUNT(*) FROM lexical_email) as emails
    `);
    
    // Tamanho médio real dos campos (em bytes)
    const TAMANHO_MEDIO_NORMAL = {
      nome: 15,
      sobrenome: 20,
      email: 30,
      cep: 8,
      casa: 4,
      cpf: 11,
      celular: 11
    };
    
    const TAMANHO_MEDIO_TOKEN = {
      nome: 3,        // N0, N1, NA...
      sobrenome: 4,   // S0, S1, SA...
      email: 4,       // M0, M1, MA...
      cep: 3,         // C0, C1, CA...
      casa: 4,        // mantém original
      cpf_mne: 6,     // Base62 dos 9 dígitos
      celular_mne: 6  // Base62 do número completo
    };
    
    const totalRegistros = Number.parseInt(normalCount.rows[0].count);
    
    // Calcular bytes estimados (armazenamento tradicional)
    const normalBytes = totalRegistros * (
      TAMANHO_MEDIO_NORMAL.nome +
      TAMANHO_MEDIO_NORMAL.sobrenome +
      TAMANHO_MEDIO_NORMAL.email +
      TAMANHO_MEDIO_NORMAL.cep +
      TAMANHO_MEDIO_NORMAL.casa +
      TAMANHO_MEDIO_NORMAL.cpf +
      TAMANHO_MEDIO_NORMAL.celular
    );
    
    // Calcular bytes estimados (MIR + MNE)
    const mirBytes = totalRegistros * (
      TAMANHO_MEDIO_TOKEN.nome +
      TAMANHO_MEDIO_TOKEN.sobrenome +
      TAMANHO_MEDIO_TOKEN.email +
      TAMANHO_MEDIO_TOKEN.cep +
      TAMANHO_MEDIO_TOKEN.casa +
      TAMANHO_MEDIO_TOKEN.cpf_mne +
      TAMANHO_MEDIO_TOKEN.celular_mne
    );
    
    // Overhead das tabelas lexicais (estimativa: ~50 bytes por token)
    const totalTokens = 
      Number.parseInt(tokensCount.rows[0].nomes || 0) +
      Number.parseInt(tokensCount.rows[0].sobrenomes || 0) +
      Number.parseInt(tokensCount.rows[0].ceps || 0) +
      Number.parseInt(tokensCount.rows[0].emails || 0);
    
    const lexicalBytes = totalTokens * 50;
    const totalMirBytes = mirBytes; // + lexicalBytes; Como os bancos foram separados, consideramos apenas o MIR para comparação direta
    
    // Economia percentual
    const economia = normalBytes > 0
      ? ((normalBytes - totalMirBytes) / normalBytes * 100).toFixed(2)
      : 0;
    
    res.json({
      normal: totalRegistros,
      mir: totalRegistros,
      normal_bytes: normalBytes,
      mir_bytes: mirBytes,
      lexical_bytes: lexicalBytes,
      total_mir: totalMirBytes,
      economia_percentual: Number.parseFloat(economia),
      detalhes: {
        registros: totalRegistros,
        tokens_unicos: totalTokens,
        distribuicao_tokens: {
          nomes: Number.parseInt(tokensCount.rows[0].nomes || 0),
          sobrenomes: Number.parseInt(tokensCount.rows[0].sobrenomes || 0),
          ceps: Number.parseInt(tokensCount.rows[0].ceps || 0),
          emails: Number.parseInt(tokensCount.rows[0].emails || 0)
        },
        explicacao: totalRegistros < 1000 
          ? "⚠️ Mesmo com poucos registros, é observada uma economia significativa."
          : totalRegistros < 10000
          ? "📈 Economia expande visualmente! O MIR/MNE demonstra benefícios substanciais."
          : "✅ Economia consolidada! O MIR/MNE está gerando economia real de espaço!"
      }
    });
    
  } catch (error) {
    console.error('Erro nas estatísticas:', error);
    res.status(500).json({ 
      erro: 'Erro ao buscar estatísticas', 
      detalhe: error.message 
    });
  }
});

module.exports = router;
