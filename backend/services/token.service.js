// services/token.service.js
const { lexicalDb } = require('../config/multiDb');

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function encodeBase62(numero) {
  if (numero === 0) return '0';
  
  let resultado = '';
  let n = BigInt(numero);
  const base = 62n;
  
  while (n > 0) {
    const resto = Number(n % base);
    resultado = BASE62[resto] + resultado;
    n = n / base;
  }
  
  // Garantir que o token não ultrapasse 4 caracteres
  if (resultado.length > 4) {
    resultado = resultado.substring(0, 4);
  }
  
  return resultado;
}

async function obterOuCriarToken(tabela, prefixo, valor) {
  if (!valor || valor.trim() === '') return null;
  
  const valorLimpo = valor.trim().toLowerCase();
  
  try {
    // Buscar token existente
    const busca = await lexicalDb.query(
      `SELECT token FROM ${tabela} WHERE valor = $1`,
      [valorLimpo]
    );
    
    if (busca.rows.length > 0) {
      // Incrementar frequência
      await lexicalDb.query(
        `UPDATE ${tabela} SET frequencia = frequencia + 1 WHERE valor = $1`,
        [valorLimpo]
      );
      return busca.rows[0].token;
    }
    
    // Criar novo token progressivo
    const total = await lexicalDb.query(`SELECT COUNT(*) FROM ${tabela}`);
    const contador = parseInt(total.rows[0].count);
    const tokenBase = encodeBase62(contador);
    const novoToken = `${prefixo}${tokenBase}`;
    
    // Verificar tamanho do token
    if (novoToken.length > 8) {
      console.error(`❌ Token muito longo: ${novoToken} (${novoToken.length} chars)`);
      throw new Error(`Token gerado excede 8 caracteres: ${novoToken}`);
    }
    
    await lexicalDb.query(
      `INSERT INTO ${tabela} (token, valor, frequencia) VALUES ($1, $2, 1)`,
      [novoToken, valorLimpo]
    );
    
    console.log(`🆕 Novo token criado: ${tabela} → ${novoToken} = "${valorLimpo}"`);
    return novoToken;
    
  } catch (error) {
    console.error(`❌ Erro ao criar token para ${tabela}:`, error.message);
    throw error;
  }
}

async function reconstruirValor(tabela, token) {
  if (!token) return null;
  
  try {
    const result = await lexicalDb.query(
      `SELECT valor FROM ${tabela} WHERE token = $1`,
      [token]
    );
    
    return result.rows[0]?.valor || null;
  } catch (error) {
    console.error(`❌ Erro ao reconstruir ${tabela}:`, error.message);
    return null;
  }
}

module.exports = {
  obterOuCriarToken,
  reconstruirValor,
  encodeBase62
};