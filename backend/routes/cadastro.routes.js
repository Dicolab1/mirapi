// routes/cadastro.routes.js
const router = require('express').Router();
const { mirdb } = require('../config/multiDb');
const { obterOuCriarToken } = require('../services/token.service');
const { tokenizarSobrenome } = require('../services/mir.service');  // ← IMPORTANTE!
const { compactarCPF, compactarCelular } = require('../services/mne.service');

router.post('/', async (req, res) => {
  const client = await mirdb.connect();
  
  try {
    const { nome, sobrenome, email, celular, cep, casa, cpf } = req.body;
    
    await client.query('BEGIN');
    
    // Tokenização (MIR)
    const nomeToken = await obterOuCriarToken('lexical_nome', 'N', nome);
    
    // ✅ CORRETO: Usar tokenizarSobrenome para separar partes
    const sobrenomeToken = await tokenizarSobrenome(sobrenome);  // ← CHAVE!
    
    const emailToken = await obterOuCriarToken('lexical_email', 'M', email);
    const cepToken = await obterOuCriarToken('lexical_cep', 'C', cep);
    
    // MNE (Mathematical Numeric Encoding) para CPF e Celular
    const cpfMNE = compactarCPF(cpf);
    const celMNE = compactarCelular(celular);
    
    // Inserir na tabela normal (referência)
    const normalResult = await client.query(`
      INSERT INTO pessoas_normal (nome, sobrenome, email, cel, cep, casa, cpf)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [nome, sobrenome, email, celular, cep, casa, cpf]);
    
    const pessoaId = normalResult.rows[0].id;
    
    // Inserir na tabela MIR (apenas tokens)
    await client.query(`
      INSERT INTO pessoas_mir 
      (id, nome_token, sobrenome_token, email_token, cep_token, casa, cpf_mne, cel_mne)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [pessoaId, nomeToken, sobrenomeToken, emailToken, cepToken, casa, cpfMNE, celMNE]);
    
    await client.query('COMMIT');
    
    res.json({
      sucesso: true,
      mensagem: 'Cadastro realizado com sucesso!',
      normal: { id: pessoaId, nome, sobrenome, email, celular, cep, casa, cpf },
      mir: {
        id: pessoaId,
        nome_token: nomeToken,
        sobrenome_token: sobrenomeToken,
        email_token: emailToken,
        cep_token: cepToken,
        casa,
        cpf_mne: cpfMNE,
        cel_mne: celMNE
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro no cadastro:', error);
    res.status(500).json({ erro: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;