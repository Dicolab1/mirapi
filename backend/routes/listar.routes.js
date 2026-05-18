const router = require('express').Router();
const { mirdb } = require('../config/multiDb');
const { reconstruirValor } = require('../services/token.service');
const { reconstruirSobrenome } = require('../services/mir.service');  // ← IMPORTANTE!
const { formatarCPF, formatarCelular } = require('../services/mne.service');

// Função para buscar endereço pelo CEP
async function buscarEnderecoPorCEP(cep) {
  if (!cep) return null;
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();
    
    if (data.erro) return null;
    
    return {
      rua: data.logradouro || 'Não informado',
      bairro: data.bairro || 'Não informado',
      cidade: data.localidade || 'Não informado',
      estado: data.uf || 'Não informado'
    };
  } catch (error) {
    console.error(`Erro ao buscar CEP ${cep}:`, error.message);
    return null;
  }
}

router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const pessoas = await mirdb.query(`
      SELECT * FROM pessoas_mir
      ORDER BY id DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    const totalResult = await mirdb.query('SELECT COUNT(*) FROM pessoas_mir');
    const totalRegistros = Number.parseInt(totalResult.rows[0].count);
    
    const dados = [];
    for (const pessoa of pessoas.rows) {
      // Reconstruir tokens (vindos do lexicaldb)
      const [nome, cep, email] = await Promise.all([
        reconstruirValor('lexical_nome', pessoa.nome_token),
        reconstruirValor('lexical_cep', pessoa.cep_token),
        reconstruirValor('lexical_email', pessoa.email_token)
      ]);
      
      // Reconstruir sobrenome (pode ter pipe separando partes)
      let sobrenome = 'Não informado';
      if (pessoa.sobrenome_token) {
        sobrenome = await reconstruirSobrenome(pessoa.sobrenome_token);
      }
      
      // Buscar endereço completo pelo CEP
      const endereco = await buscarEnderecoPorCEP(cep);
      
      // Reconstruir MNE (matemático, não precisa de banco lexical)
      const cpfFormatado = pessoa.cpf_mne ? formatarCPF(pessoa.cpf_mne) : 'Não informado';
      const celFormatado = pessoa.cel_mne ? formatarCelular(pessoa.cel_mne) : 'Não informado';
      
      dados.push({
        id: pessoa.id,
        nome: nome || 'Não informado',
        sobrenome: sobrenome,
        cep: cep || 'Não informado',
        casa: pessoa.casa || 'S/N',
        rua: endereco?.rua || 'Não informado',
        bairro: endereco?.bairro || 'Não informado',
        cidade: endereco?.cidade || 'Não informado',
        estado: endereco?.estado || 'Não informado',
        cpf: cpfFormatado,
        email: email || 'Não informado',
        cel: celFormatado,
        criado_em: pessoa.created_at
      });
    }
    
    res.json({
      dados,
      paginacao: {
        pagina_atual: page,
        limite: limit,
        total_registros: totalRegistros,
        total_paginas: Math.ceil(totalRegistros / limit),
        primeiro_registro: offset + 1,
        ultimo_registro: Math.min(offset + limit, totalRegistros)
      },
      tempo_execucao_ms: Date.now() - startTime
    });
    
  } catch (error) {
    console.error('Erro na listagem:', error);
    res.status(500).json({ erro: error.message });
  }
});

module.exports = router;
// });

// module.exports = router;
