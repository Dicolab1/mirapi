// services/mir.service.js
const { lexicalDb } = require('../config/multiDb');
const { obterOuCriarToken } = require('./token.service');

async function tokenizarSobrenome(texto) {
  if (!texto) return '';
  
  const partes = texto.trim().split(/\s+/);
  const tokens = [];

  for (const parte of partes) {
    const token = await obterOuCriarToken('lexical_sobrenome', 'S', parte);
    tokens.push(token);
  }

  return tokens.join('|');
}

async function reconstruirSobrenome(tokensString) {
  if (!tokensString) return '';

  const tokens = tokensString.split('|');
  const partes = [];

  for (const token of tokens) {
    const busca = await lexicalDb.query(`
      SELECT valor FROM lexical_sobrenome WHERE token = $1
    `, [token]);
    
    partes.push(busca.rows[0]?.valor || '');
  }

  return partes.join(' ');
}

module.exports = {
  tokenizarSobrenome,
  reconstruirSobrenome
};