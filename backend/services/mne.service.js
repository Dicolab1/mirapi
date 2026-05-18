// services/mne.service.js
// MNE - Mathematical Numeric Encoding
// Para CPF e Celular - não usa tokenização, apenas compressão matemática

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function encodeBase62(numero) {
  // Garantir que numero é BigInt
  let n = BigInt(numero);
  const base = 62n;
  
  if (n === 0n) return '0';
  
  let resultado = '';
  while (n > 0n) {
    const resto = Number(n % base);
    resultado = BASE62[resto] + resultado;
    n = n / base;
  }
  
  return resultado;
}

function decodeBase62(texto) {
  let resultado = 0n;
  for (let i = 0; i < texto.length; i++) {
    resultado = resultado * 62n + BigInt(BASE62.indexOf(texto[i]));
  }
  return resultado.toString();
}

// ==================== CPF MNE ====================
function extrairBaseCPF(cpf) {
  // CPF tem 11 dígitos, mas apenas os 9 primeiros são a base
  const numeros = cpf.replace(/\D/g, '');
  if (numeros.length !== 11) {
    throw new Error('CPF deve ter 11 dígitos');
  }
  return numeros.substring(0, 9); // Retorna os 9 primeiros dígitos
}

function compactarCPF(cpf) {
  // Entrada: "12345678901" (11 dígitos)
  // Saída: "qM3c7W" (5-6 bytes)
  const base = extrairBaseCPF(cpf);
  const numero = BigInt(base);
  return encodeBase62(numero);
}

function descompactarCPF(cpfMNE) {
  // Entrada: "qM3c7W"
  // Saída: "123456789" (9 dígitos base)
  const baseNumero = decodeBase62(cpfMNE);
  return baseNumero.padStart(9, '0');
}

function calcularDigitoVerificador(base9) {
  // Calcula os dois dígitos verificadores do CPF
  // base9 são os 9 primeiros dígitos
  let soma1 = 0;
  for (let i = 0; i < 9; i++) {
    soma1 += parseInt(base9[i]) * (10 - i);
  }
  let resto1 = (soma1 * 10) % 11;
  if (resto1 === 10) resto1 = 0;
  
  let soma2 = 0;
  const parcial = base9 + resto1;
  for (let i = 0; i < 10; i++) {
    soma2 += parseInt(parcial[i]) * (11 - i);
  }
  let resto2 = (soma2 * 10) % 11;
  if (resto2 === 10) resto2 = 0;
  
  return `${resto1}${resto2}`;
}

function reconstruirCPFCompleto(cpfMNE) {
  // Reconstrói o CPF completo com dígitos verificadores
  const base9 = descompactarCPF(cpfMNE);
  const dv = calcularDigitoVerificador(base9);
  return `${base9}${dv}`;
}

function formatarCPF(cpfMNE) {
  const cpfCompleto = reconstruirCPFCompleto(cpfMNE);
  return cpfCompleto.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// ==================== CELULAR MNE ====================
function compactarCelular(celular) {
  // Entrada: "11987654321" (11 dígitos com DDD)
  const numeros = celular.replace(/\D/g, '');
  if (numeros.length !== 11) {
    throw new Error('Celular deve ter 11 dígitos com DDD');
  }
  const numero = BigInt(numeros);
  return encodeBase62(numero);
}

function descompactarCelular(celMNE) {
  // Entrada: "T4rX9k"
  // Saída: "11987654321" (11 dígitos)
  const numero = decodeBase62(celMNE);
  return numero.padStart(11, '0');
}

function formatarCelular(celMNE) {
  const celular = descompactarCelular(celMNE);
  const ddd = celular.substring(0, 2);
  const parte1 = celular.substring(2, 7);
  const parte2 = celular.substring(7, 11);
  return `(${ddd}) ${parte1}-${parte2}`;
}

module.exports = {
  // CPF
  compactarCPF,
  descompactarCPF,
  reconstruirCPFCompleto,
  formatarCPF,
  // Celular
  compactarCelular,
  descompactarCelular,
  formatarCelular,
  // Utilitários
  encodeBase62,
  decodeBase62
};