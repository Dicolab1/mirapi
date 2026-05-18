// routes/consulta.routes.js
const router = require('express').Router();
const { mirdb, lexicalDb } = require('../config/multiDb');
const { reconstruirValor } = require('../services/token.service');
const { reconstruirSobrenome } = require('../services/mir.service');
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

// Busca por termo geral (nome, email, cpf, cep)
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { termo, tipo, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    if (!termo || termo.trim() === '') {
      return res.status(400).json({ erro: 'Termo de busca não informado' });
    }
    
    const termoBusca = `%${termo.trim().toLowerCase()}%`;
    let query = '';
    let params = [];
    let tipoBusca = tipo || 'todos';
    
    // Construir query baseada no tipo de busca
    if (tipoBusca === 'nome') {
      // Buscar tokens de nome que correspondem ao termo
      const nomesTokens = await lexicalDb.query(
        `SELECT token FROM lexical_nome WHERE LOWER(valor) LIKE $1`,
        [termoBusca]
      );
      
      const tokens = nomesTokens.rows.map(r => r.token);
      
      if (tokens.length === 0) {
        return res.json({ dados: [], total_registros: 0, mensagem: 'Nenhum registro encontrado' });
      }
      
      query = `
        SELECT * FROM pessoas_mir 
        WHERE nome_token = ANY($1::varchar[])
        ORDER BY id DESC
        LIMIT $2 OFFSET $3
      `;
      params = [tokens, parseInt(limit), offset];
      
    } else if (tipoBusca === 'email') {
      // Buscar token de email
      const emailToken = await lexicalDb.query(
        `SELECT token FROM lexical_email WHERE LOWER(valor) LIKE $1`,
        [termoBusca]
      );
      
      if (emailToken.rows.length === 0) {
        return res.json({ dados: [], total_registros: 0, mensagem: 'Nenhum registro encontrado' });
      }
      
      query = `
        SELECT * FROM pessoas_mir 
        WHERE email_token = $1
        ORDER BY id DESC
        LIMIT $2 OFFSET $3
      `;
      params = [emailToken.rows[0].token, parseInt(limit), offset];
      
    } else if (tipoBusca === 'cpf') {
      // Buscar por CPF (MNE)
      const cpfLimpo = termo.replace(/\D/g, '');
      if (cpfLimpo.length === 11) {
        const { compactarCPF } = require('../services/mne.service');
        const cpfMNE = compactarCPF(cpfLimpo);
        
        query = `
          SELECT * FROM pessoas_mir 
          WHERE cpf_mne = $1
          ORDER BY id DESC
          LIMIT $2 OFFSET $3
        `;
        params = [cpfMNE, parseInt(limit), offset];
      } else {
        return res.json({ dados: [], total_registros: 0, mensagem: 'CPF inválido' });
      }
      
    } else if (tipoBusca === 'cep') {
      // Buscar por CEP
      const cepToken = await lexicalDb.query(
        `SELECT token FROM lexical_cep WHERE valor = $1`,
        [termo.replace(/\D/g, '')]
      );
      
      if (cepToken.rows.length === 0) {
        return res.json({ dados: [], total_registros: 0, mensagem: 'Nenhum registro encontrado' });
      }
      
      query = `
        SELECT * FROM pessoas_mir 
        WHERE cep_token = $1
        ORDER BY id DESC
        LIMIT $2 OFFSET $3
      `;
      params = [cepToken.rows[0].token, parseInt(limit), offset];
      
    } else {
      // Busca geral em todos os campos
      // Buscar tokens que correspondem
      const [nomesTokens, emailsTokens] = await Promise.all([
        lexicalDb.query(`SELECT token FROM lexical_nome WHERE LOWER(valor) LIKE $1`, [termoBusca]),
        lexicalDb.query(`SELECT token FROM lexical_email WHERE LOWER(valor) LIKE $1`, [termoBusca])
      ]);
      
      const tokens = [...nomesTokens.rows.map(r => r.token), ...emailsTokens.rows.map(r => r.token)];
      
      if (tokens.length === 0) {
        return res.json({ dados: [], total_registros: 0, mensagem: 'Nenhum registro encontrado' });
      }
      
      query = `
        SELECT * FROM pessoas_mir 
        WHERE nome_token = ANY($1::varchar[]) OR email_token = ANY($1::varchar[])
        ORDER BY id DESC
        LIMIT $2 OFFSET $3
      `;
      params = [tokens, parseInt(limit), offset];
    }
    
    // Executar busca
    const result = await mirdb.query(query, params);
    
    // Buscar total de registros
    let countQuery = '';
    let countParams = [];
    
    if (tipoBusca === 'nome' || tipoBusca === 'todos') {
      countQuery = `SELECT COUNT(*) FROM pessoas_mir WHERE nome_token = ANY($1::varchar[])`;
      countParams = [params[0]];
    } else if (tipoBusca === 'email') {
      countQuery = `SELECT COUNT(*) FROM pessoas_mir WHERE email_token = $1`;
      countParams = [params[0]];
    } else if (tipoBusca === 'cpf') {
      countQuery = `SELECT COUNT(*) FROM pessoas_mir WHERE cpf_mne = $1`;
      countParams = [params[0]];
    } else if (tipoBusca === 'cep') {
      countQuery = `SELECT COUNT(*) FROM pessoas_mir WHERE cep_token = $1`;
      countParams = [params[0]];
    }
    
    const totalResult = await mirdb.query(countQuery, countParams);
    const totalRegistros = parseInt(totalResult.rows[0].count);
    
    // Reconstruir dados
    const dados = [];
    for (const pessoa of result.rows) {
      const [nome, email, cep] = await Promise.all([
        reconstruirValor('lexical_nome', pessoa.nome_token),
        reconstruirValor('lexical_email', pessoa.email_token),
        reconstruirValor('lexical_cep', pessoa.cep_token)
      ]);
      
      let sobrenome = 'Não informado';
      if (pessoa.sobrenome_token) {
        sobrenome = await reconstruirSobrenome(pessoa.sobrenome_token);
      }
      
      const endereco = await buscarEnderecoPorCEP(cep);
      const cpfFormatado = pessoa.cpf_mne ? formatarCPF(pessoa.cpf_mne) : 'Não informado';
      const celFormatado = pessoa.cel_mne ? formatarCelular(pessoa.cel_mne) : 'Não informado';
      
      dados.push({
        id: pessoa.id,
        nome: nome || 'Não informado',
        sobrenome: sobrenome,
        email: email || 'Não informado',
        cel: celFormatado,
        cep: cep || 'Não informado',
        casa: pessoa.casa || 'S/N',
        rua: endereco?.rua || 'Não informado',
        bairro: endereco?.bairro || 'Não informado',
        cidade: endereco?.cidade || 'Não informado',
        estado: endereco?.estado || 'Não informado',
        cpf: cpfFormatado
      });
    }
    
    res.json({
      dados,
      total_registros: totalRegistros,
      pagina_atual: parseInt(page),
      total_paginas: Math.ceil(totalRegistros / parseInt(limit)),
      tempo_execucao_ms: Date.now() - startTime
    });
    
  } catch (error) {
    console.error('Erro na busca:', error);
    res.status(500).json({ erro: error.message });
  }
});

module.exports = router;