//--------------------------------------------------
// VARIÁVEIS GLOBAIS
//--------------------------------------------------
let paginaAtual = 1;
let limitePorPagina = 20;
let totalPaginas = 1;
let graficoBytes;
let graficoEconomia;

//--------------------------------------------------
// CONSTANTES (evita duplicação)
//--------------------------------------------------
const CAMPOS_FORMULARIO = ['nome', 'sobrenome', 'email', 'celular', 'cep', 'casa', 'cpf', 'rua', 'cidade'];

const CONFIG_GRAFICO_DOUGHNUT = {
    cutout: '65%',
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
        legend: {
            display: true,
            position: 'bottom',
            labels: {
                color: '#888',
                font: { size: 11, family: "'DM Sans', sans-serif" },
                boxWidth: 10,
                padding: 8
            }
        },
        tooltip: {
            callbacks: {
                label: (context) => `${context.label}: ${context.raw.toFixed(1)}%`
            }
        }
    },
    layout: {
        padding: { top: 10, bottom: 10, left: 10, right: 10 }
    }
};

//--------------------------------------------------
// FUNÇÃO PARA CRIAR CARD DE PESSOA (evita duplicação)
//--------------------------------------------------
function criarCardPessoa(pessoa, isResultadoBusca = false) {
    const classeExtra = isResultadoBusca ? 'resultado-busca' : '';
    return `
        <div class="card ${classeExtra}">
            <h3>${escapeHtml(pessoa.nome)} ${escapeHtml(pessoa.sobrenome)} <span style="font-size:11px;">#${pessoa.id}</span></h3>
            <p><strong>📧 Email:</strong> ${escapeHtml(pessoa.email)}</p>
            <p><strong>📱 Celular:</strong> ${escapeHtml(pessoa.cel)}</p>
            <p><strong>📮 Endereço:</strong> ${escapeHtml(pessoa.rua)}, ${escapeHtml(pessoa.casa)} - ${escapeHtml(pessoa.bairro)}</p>
            <p><strong>🏙️ Cidade/UF:</strong> ${escapeHtml(pessoa.cidade)}/${escapeHtml(pessoa.estado)} - CEP: ${escapeHtml(pessoa.cep)}</p>
            <p><strong>📄 CPF:</strong> ${escapeHtml(pessoa.cpf)}</p>
            <button class="danger" onclick="excluir(${pessoa.id})">🗑️ Excluir</button>
        </div>
    `;
}

//--------------------------------------------------
// GERAR CPF VÁLIDO
//--------------------------------------------------
function gerarCPF() {
    let numeros = '';
    for (let i = 0; i < 9; i++) {
        numeros += Math.floor(Math.random() * 10);
    }
    
    const soma1 = calcularSoma(numeros, 9, (val, idx) => val * (10 - idx));
    let resto1 = (soma1 * 10) % 11;
    if (resto1 === 10) resto1 = 0;
    
    const parcial = numeros + resto1;
    const soma2 = calcularSoma(parcial, 10, (val, idx) => val * (11 - idx));
    let resto2 = (soma2 * 10) % 11;
    if (resto2 === 10) resto2 = 0;
    
    const cpfFinal = numeros + resto1.toString() + resto2.toString();
    document.getElementById('cpf').value = cpfFinal;
}

function calcularSoma(str, limite, fn) {
    let soma = 0;
    for (let i = 0; i < limite; i++) {
        soma += fn(Number.parseInt(str[i]), i);
    }
    return soma;
}

//--------------------------------------------------
// BUSCAR CEP VIA VIACEP
//--------------------------------------------------
async function buscarCEP() {
    const cep = document.getElementById('cep').value.replace(/\D/g, '');
    if (cep.length !== 8) return;
    
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (data.erro) {
            alert('CEP não encontrado');
            return;
        }
        document.getElementById('rua').value = data.logradouro || '';
        document.getElementById('cidade').value = data.localidade || '';
    } catch (error) {
        console.error(error);
        alert('Erro ao consultar CEP');
    }
}

//--------------------------------------------------
// CADASTRO
//--------------------------------------------------
async function cadastrar() {
    const body = {
        nome: document.getElementById('nome').value,
        sobrenome: document.getElementById('sobrenome').value,
        email: document.getElementById('email').value,
        celular: document.getElementById('celular').value,
        cep: document.getElementById('cep').value,
        casa: document.getElementById('casa').value,
        cpf: document.getElementById('cpf').value
    };
    
    try {
        const response = await fetch('/cadastro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || 'Erro no cadastro');
        
        document.getElementById('resultado').innerHTML = `
            <div style="background: #1a1a1a; padding: 15px; border-radius: 8px;">
                <h2 style="color: #4caf50;">✅ Cadastro Realizado!</h2>
                <h3>📝 Modo Tradicional</h3>
                <pre>${JSON.stringify(data.normal, null, 2)}</pre>
                <h3>🔐 MIR + MNE</h3>
                <pre>${JSON.stringify(data.mir, null, 2)}</pre>
            </div>
        `;
        
        CAMPOS_FORMULARIO.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('nome').focus();
        
        await listar();
        await estatisticas();
        
    } catch (error) {
        console.error(error);
        document.getElementById('resultado').innerHTML = `
            <div style="background: #2a1a1a; padding: 15px;">
                <h2 style="color: #f44336;">❌ Erro: ${error.message}</h2>
            </div>
        `;
    }
}

//--------------------------------------------------
// CRIAÇÃO DOS GRÁFICOS (refatorada)
//--------------------------------------------------
function criarGraficoBarras(ctx, data) {
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Normal', 'MIR', 'Lexical', 'Total MIR'],
            datasets: [{
                label: 'Bytes',
                data: [data.normal_bytes || 0, data.mir_bytes || 0, data.lexical_bytes || 0, data.total_mir || 0],
                backgroundColor: ['rgba(124,111,255,0.25)', 'rgba(124,111,255,0.50)', 'rgba(124,111,255,0.75)', 'rgba(124,111,255,1)'],
                borderColor: 'rgba(124, 111, 255, 1)',
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

function criarGraficoDoughnut(ctx, economiaPerc) {
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Economia MIR', 'Tamanho restante'],
            datasets: [{
                data: [economiaPerc, 100 - economiaPerc],
                backgroundColor: ['rgba(62,207,142,0.85)', 'rgba(255,255,255,0.06)'],
                borderColor: ['rgba(62, 207, 142, 1)', 'rgba(255, 255, 255, 0.08)'],
                borderWidth: 1,
                borderRadius: 8,
                spacing: 2
            }]
        },
        options: CONFIG_GRAFICO_DOUGHNUT,
        plugins: [{
            id: 'centroEconomia',
            afterDraw(chart) {
                const { ctx, chartArea: { top, left, width, height } } = chart;
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const cx = left + width / 2;
                const cy = top + height / 2;
                ctx.font = 'bold 20px "DM Sans", sans-serif';
                ctx.fillStyle = '#3ecf8e';
                ctx.fillText(economiaPerc.toFixed(1) + '%', cx, cy - 8);
                ctx.font = '11px "DM Sans", sans-serif';
                ctx.fillStyle = '#888';
                ctx.fillText('de economia', cx, cy + 14);
                ctx.restore();
            }
        }]
    });
}

//--------------------------------------------------
// ESTATÍSTICAS
//--------------------------------------------------
async function estatisticas() {
    try {
        const response = await fetch('/estatisticas');
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || 'Erro nas estatísticas');
        
        if (graficoBytes) graficoBytes.destroy();
        if (graficoEconomia) graficoEconomia.destroy();
        
        const ctxBytes = document.getElementById('graficoBytes');
        if (ctxBytes) {
            graficoBytes = criarGraficoBarras(ctxBytes, data);
        }
        
        const ctxEconomia = document.getElementById('graficoEconomia');
        if (ctxEconomia) {
            graficoEconomia = criarGraficoDoughnut(ctxEconomia, data.economia_percentual || 0);
        }
        
        const statsDiv = document.getElementById('stats');
        if (statsDiv) {
            statsDiv.innerHTML = `
📊 ESTATÍSTICAS DO BANCO DE DADOS

📝 Tabela Normal: ${data.normal.toLocaleString()} registros (${formatarBytes(data.normal_bytes)})
🔐 Tabela MIR: ${data.mir.toLocaleString()} registros (${formatarBytes(data.mir_bytes)})
📚 Tabelas Lexicais: ${formatarBytes(data.lexical_bytes)} (Existentes em outro banco)
💾 Total MIR: ${formatarBytes(data.total_mir)}
📈 Economia: ${data.economia_percentual.toFixed(2)}%

${data.detalhes?.explicacao || ''}
            `;
        }
        
    } catch (error) {
        console.error('Erro nas estatísticas:', error);
        const statsDiv = document.getElementById('stats');
        if (statsDiv) statsDiv.innerHTML = `❌ Erro: ${error.message}`;
    }
}

function formatarBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

//--------------------------------------------------
// LISTAR COM PAGINAÇÃO
//--------------------------------------------------
async function listar() {
    try {
        const container = document.getElementById('lista');
        if (!container) return;
        
        container.innerHTML = '<div class="loading-spinner"></div><p>Carregando...</p>';
        
        const response = await fetch(`/listar?page=${paginaAtual}&limit=${limitePorPagina}`);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.erro || 'Erro na listagem');
        
        if (data.paginacao) {
            paginaAtual = data.paginacao.pagina_atual;
            totalPaginas = data.paginacao.total_paginas;
            limitePorPagina = data.paginacao.limite;
        }
        
        container.innerHTML = '';
        
        if (data.dados.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #888;">Nenhum registro encontrado</p>';
            const pagContainer = document.getElementById('paginacao-controles');
            if (pagContainer) pagContainer.innerHTML = '';
            return;
        }
        
        data.dados.forEach(pessoa => {
            container.innerHTML += criarCardPessoa(pessoa);
        });
        
        const tempoDiv = document.getElementById('tempo');
        if (tempoDiv) tempoDiv.innerHTML = `<span>⏱️ ${data.tempo_execucao_ms} ms</span>`;
        
        renderizarPaginacao(data.paginacao);
        
    } catch (error) {
        console.error('Erro na listagem:', error);
        const container = document.getElementById('lista');
        if (container) container.innerHTML = `<p style="color:#f44336;">❌ Erro: ${error.message}</p>`;
    }
}

//--------------------------------------------------
// BUSCA AVANÇADA (refatorada)
//--------------------------------------------------
async function buscarAvancado() {
    const termo = document.getElementById('searchTerm').value;
    const tipo = document.getElementById('searchType').value;
    
    if (!termo.trim()) {
        alert('Digite um termo para buscar');
        return;
    }
    
    const buscaInfo = document.getElementById('buscaInfo');
    buscaInfo.style.display = 'block';
    buscaInfo.innerHTML = '<div class="loading-spinner"></div> Buscando...';
    
    try {
        const response = await fetch(`/consulta?termo=${encodeURIComponent(termo)}&tipo=${tipo}&page=1&limit=50`);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.erro);
        
        const container = document.getElementById('lista');
        buscaInfo.innerHTML = `🔍 Encontrados ${data.total_registros} registro(s) em ${data.tempo_execucao_ms} ms`;
        
        if (data.dados.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #888;">Nenhum resultado encontrado</p>';
            return;
        }
        
        container.innerHTML = '';
        data.dados.forEach(pessoa => {
            container.innerHTML += criarCardPessoa(pessoa, true);
        });
        
        document.getElementById('paginacao-controles').innerHTML = '';
        
    } catch (error) {
        console.error(error);
        buscaInfo.innerHTML = `<span style="color:#f44336;">❌ Erro: ${error.message}</span>`;
    }
}

function limparBusca() {
    document.getElementById('searchTerm').value = '';
    document.getElementById('buscaInfo').style.display = 'none';
    paginaAtual = 1;
    listar();
}

//--------------------------------------------------
// PAGINAÇÃO
//--------------------------------------------------
function renderizarPaginacao(paginacao) {
    const container = document.getElementById('paginacao-controles');
    if (!container) return;
    
    if (!paginacao || paginacao.total_registros === 0) {
        container.innerHTML = '';
        return;
    }
    
    const { pagina_atual, total_paginas, total_registros, primeiro_registro, ultimo_registro } = paginacao;
    
    container.innerHTML = `
        <div class="paginacao-container">
            <div class="paginacao-info">📊 Mostrando ${primeiro_registro} a ${ultimo_registro} de ${total_registros.toLocaleString()} registros</div>
            <div class="paginacao-botoes">
                <button onclick="irParaPagina(1)" ${pagina_atual === 1 ? 'disabled' : ''}>⏮️</button>
                <button onclick="paginaAnterior()" ${pagina_atual === 1 ? 'disabled' : ''}>◀</button>
                <span>Página ${pagina_atual} de ${total_paginas}</span>
                <button onclick="proximaPagina()" ${pagina_atual === total_paginas ? 'disabled' : ''}>▶</button>
                <button onclick="irParaPagina(${total_paginas})" ${pagina_atual === total_paginas ? 'disabled' : ''}>⏭️</button>
            </div>
            <div class="paginacao-limite">
                <label>📄 Por página:</label>
                <select id="limitePorPagina" onchange="mudarLimite()">
                    ${[10, 20, 50, 100].map(val => `<option value="${val}" ${limitePorPagina === val ? 'selected' : ''}>${val}</option>`).join('')}
                </select>
            </div>
        </div>
    `;
}

function irParaPagina(pagina) {
    if (pagina >= 1 && pagina <= totalPaginas && pagina !== paginaAtual) {
        paginaAtual = pagina;
        listar();
        document.getElementById('lista')?.scrollIntoView({ behavior: 'smooth' });
    }
}

function paginaAnterior() { if (paginaAtual > 1) irParaPagina(paginaAtual - 1); }
function proximaPagina() { if (paginaAtual < totalPaginas) irParaPagina(paginaAtual + 1); }

function mudarLimite() {
    const select = document.getElementById('limitePorPagina');
    if (select) {
        const novoLimite = Number.parseInt(select.value);
        if (novoLimite !== limitePorPagina) {
            limitePorPagina = novoLimite;
            paginaAtual = 1;
            listar();
        }
    }
}

//--------------------------------------------------
// EXCLUIR
//--------------------------------------------------
async function excluir(id) {
    if (!confirm('⚠️ Excluir permanentemente?')) return;
    try {
        const response = await fetch(`/excluir/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || 'Erro na exclusão');
        alert('✅ Registro excluído!');
        await listar();
        await estatisticas();
    } catch (error) {
        alert(`❌ Erro: ${error.message}`);
    }
}

//--------------------------------------------------
// MODAIS (LIMPEZA E SEED)
//--------------------------------------------------
function abrirModalLimpeza() {
    const modal = document.getElementById('modalLimpeza');
    if (modal) modal.style.display = 'flex';
    const senhaInput = document.getElementById('senhaLimpeza');
    if (senhaInput) senhaInput.value = '';
    const statusDiv = document.getElementById('statusLimpeza');
    if (statusDiv) statusDiv.innerHTML = '';
}

function fecharModalLimpeza() {
    const modal = document.getElementById('modalLimpeza');
    if (modal) modal.style.display = 'none';
}

async function confirmarLimpeza() {
    const senha = document.getElementById('senhaLimpeza')?.value;
    const statusDiv = document.getElementById('statusLimpeza');
    
    if (!senha) {
        if (statusDiv) statusDiv.innerHTML = '<p style="color: #ff6b6b;">❌ Digite a senha!</p>';
        return;
    }
    
    if (statusDiv) statusDiv.innerHTML = '<div class="loading-spinner"></div><p>Processando...</p>';
    
    try {
        const response = await fetch('/admin/limpar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senha })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || 'Erro na limpeza');
        
        if (statusDiv) statusDiv.innerHTML = `<div style="background:#4caf50;padding:15px;border-radius:8px;"><strong>✅ ${data.mensagem}</strong></div>`;
        
        setTimeout(() => {
            fecharModalLimpeza();
            paginaAtual = 1;
            listar();
            estatisticas();
        }, 2000);
        
    } catch (error) {
        if (statusDiv) statusDiv.innerHTML = `<p style="color:#ff6b6b;">❌ ${error.message}</p>`;
    }
}

function abrirModalSeed() {
    const modal = document.getElementById('modalSeed');
    if (modal) modal.style.display = 'flex';
    const senhaInput = document.getElementById('senhaSeed');
    if (senhaInput) senhaInput.value = '';
    const statusDiv = document.getElementById('statusSeed');
    if (statusDiv) statusDiv.innerHTML = '';
}

function fecharModalSeed() {
    const modal = document.getElementById('modalSeed');
    if (modal) modal.style.display = 'none';
}

async function confirmarSeed() {
    const senha = document.getElementById('senhaSeed')?.value;
    const quantidade = document.getElementById('quantidadeRegistros')?.value;
    const statusDiv = document.getElementById('statusSeed');
    
    if (!senha) {
        if (statusDiv) statusDiv.innerHTML = '<p style="color:#ff6b6b;">❌ Digite a senha!</p>';
        return;
    }
    
    if (statusDiv) statusDiv.innerHTML = '<div class="loading-spinner"></div><p>Populando...</p>';
    
    try {
        const response = await fetch('/admin/seed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senha, quantidade: Number.parseInt(quantidade) })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || 'Erro na população');
        
        if (statusDiv) statusDiv.innerHTML = `<div style="background:#4caf50;padding:15px;border-radius:8px;"><strong>✅ ${data.mensagem}</strong></div>`;
        
        setTimeout(() => {
            fecharModalSeed();
            listar();
            estatisticas();
        }, 2000);
        
    } catch (error) {
        if (statusDiv) statusDiv.innerHTML = `<p style="color:#ff6b6b;">❌ ${error.message}</p>`;
    }
}

function escapeHtml(texto) {
    if (!texto) return '';
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

//--------------------------------------------------
// FECHAR MODAL CLICANDO FORA
//--------------------------------------------------
window.onclick = function(event) {
    const modalLimpeza = document.getElementById('modalLimpeza');
    const modalSeed = document.getElementById('modalSeed');
    if (event.target === modalLimpeza) fecharModalLimpeza();
    if (event.target === modalSeed) fecharModalSeed();
};

//--------------------------------------------------
// INICIALIZAÇÃO
//--------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    listar();
    estatisticas();
});
