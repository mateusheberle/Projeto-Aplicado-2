document.addEventListener('DOMContentLoaded', () => {
  carregarDashboard();
  
  // Adicionar listeners aos botões de filtro
  document.querySelectorAll('.btn-filtro').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('ativo'));
      e.target.classList.add('ativo');
      filtroAtivo = e.target.dataset.tipo;
      renderMovimentacoes(movimentacoesData);
    });
  });
  
  // Listener para botão de exportar PDF
  document.getElementById('btnExportarPDF').addEventListener('click', exportarPDF);
});

// Variável global para armazenar a instância do gráfico de categorias
let categoriasPieChart = null;

// Variáveis globais para filtro
let movimentacoesData = [];
let filtroAtivo = 'all';

async function carregarDashboard() {
  loading(true);
  try {
    const data = await DashboardAPI.obterDados();
    
    // 1. Preencher os cards de métricas
    preencherCards(data.cards);
    
    // 2. Carregar movimentações
    await carregarMovimentacoes();
    
  } catch (err) {
    toast('Erro ao carregar dados do dashboard: ' + err.message, 'err');
    console.error(err);
  } finally {
    loading(false);
  }
}

async function carregarMovimentacoes() {
  try {
    const response = await MovimentacaoAPI.listar({});
    // A API retorna um array diretamente
    movimentacoesData = Array.isArray(response) ? response : (response.dados || []);
    renderMovimentacoes(movimentacoesData);
  } catch (err) {
    toast('Erro ao carregar movimentações: ' + err.message, 'err');
    console.error(err);
  }
}

function renderMovimentacoes(lista) {
  const tbody = document.getElementById('movimentacoesTbody');
  
  if (!lista || !lista.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="td-vazio">Nenhuma movimentação registrada.</td></tr>';
    return;
  }
  
  // Filtrar por tipo se necessário
  let listaFiltrada = lista;
  if (filtroAtivo !== 'all') {
    listaFiltrada = lista.filter(m => String(m.tipo) === filtroAtivo);
  }
  
  if (!listaFiltrada.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="td-vazio">Nenhuma movimentação deste tipo.</td></tr>';
    return;
  }
  
  tbody.innerHTML = listaFiltrada.map(m => `
    <tr>
      <td style="font-size: 13px;">${fmtData(m.data_movimentacao)}</td>
      <td><span class="badge-tipo-${m.tipo}">${m.tipoNome || getTipoLabel(m.tipo)}</span></td>
      <td class="td-nome">${esc(m.nomeProduto || m.produto || '—')}</td>
      <td style="text-align: center;">${m.quantidade}</td>
      <td style="font-size: 13px; color: var(--muted);">${esc(m.nomeEstoqueOrigem || m.estoque_origem || '—')}</td>
      <td style="font-size: 13px; color: var(--muted);">${esc(m.nomeEstoqueDestino || m.estoque_destino || '—')}</td>
      <td style="font-size: 13px;">${esc(m.nomeUsuario || m.usuario || '—')}</td>
    </tr>
  `).join('');
}

function getTipoLabel(tipo) {
  const tipos = { 1: 'Entrada', 2: 'Saída', 3: 'Transferência' };
  return tipos[tipo] || '—';
}

function preencherCards(cards) {
  const cardTotalProdutos = document.getElementById('cardTotalProdutos');
  const cardCategorias = document.getElementById('cardCategorias');
  const cardProdutoMaisCaro = document.getElementById('cardProdutoMaisCaro');

  // A página pode não exibir cards; nesse caso, não tenta renderizá-los.
  if (!cardTotalProdutos && !cardCategorias && !cardProdutoMaisCaro) return;

  if (cardTotalProdutos) cardTotalProdutos.textContent = cards?.totalProdutos ?? '—';
  if (cardCategorias) cardCategorias.textContent = cards?.totalCategorias ?? '—';
  
  if (cardProdutoMaisCaro && cards?.produtoMaisCaro) {
    cardProdutoMaisCaro.innerHTML = `
      <div style="font-size: 20px; font-weight: 700;">R$ ${fmtPreco(cards.produtoMaisCaro.preco)}</div>
      <div style="font-size: 11px; font-weight: 500; color: var(--muted); margin-top: 3px; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${esc(cards.produtoMaisCaro.nome)}">${esc(cards.produtoMaisCaro.nome)}</div>
    `;
  } else if (cardProdutoMaisCaro) {
    cardProdutoMaisCaro.textContent = '—';
  }
}

function renderCategorias(lista) {
  const canvas = document.getElementById('categoriasPieChart');
  
  if (!lista || !lista.length) {
    canvas.style.display = 'none';
    return;
  }
  
  canvas.style.display = 'block';
  
  // Destruir gráfico anterior se existir
  if (categoriasPieChart) {
    categoriasPieChart.destroy();
  }
  
  // Extrair dados para o gráfico
  const labels = lista.map(cat => esc(cat.categoria));
  const data = lista.map(cat => parseFloat(cat.porcentagem || 0));
  
  // Paleta de cores
  const colors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'
  ];
  
  const backgroundColors = colors.slice(0, lista.length);
  const borderColors = backgroundColors.map(color => color);
  
  // Criar gráfico de pizza
  const ctx = canvas.getContext('2d');
  categoriasPieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: {
              size: 12,
              weight: 500
            },
            padding: 15,
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.label + ': ' + context.parsed + '%';
            }
          }
        }
      }
    }
  });
}

function renderEstoqueBaixo(lista) {
  const tbody = document.getElementById('estoqueBaixoTbody');
  
  if (!lista || !lista.length) {
    tbody.innerHTML = '<tr><td colspan="2" class="td-vazio" style="color: #1b6b31; font-weight: 600;">Estoque regularizado. Nenhum item baixo!</td></tr>';
    return;
  }
  
  tbody.innerHTML = lista.map(p => `
    <tr>
      <td class="td-nome" style="font-size: 13.5px;">${esc(p.nome)}</td>
      <td style="text-align: right; padding-right: 24px;">
        <span class="badge-alerta">${p.estoque}</span>
      </td>
    </tr>
  `).join('');
}

function renderProdutosMaisCaros(lista) {
  const tbody = document.getElementById('maisCarosTbody');
  
  if (!lista || !lista.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="td-vazio">Nenhum produto cadastrado.</td></tr>';
    return;
  }
  
  tbody.innerHTML = lista.map(p => `
    <tr>
      <td class="td-nome">${esc(p.nome)}</td>
      <td>${esc(p.categoria || '—')}</td>
      <td>${esc(p.marca || '—')}</td>
      <td class="td-preco">R$ ${fmtPreco(p.preco)}</td>
    </tr>
  `).join('');
}

/* ── UI Helpers ── */
function loading(s) {
  document.getElementById('loading').style.display = s ? 'flex' : 'none';
}

function exportarPDF() {
  const elemento = document.querySelector('main.conteudo');
  const nomeArquivo = `relatorio_movimentacoes_${new Date().toISOString().split('T')[0]}.pdf`;
  
  const opcoes = {
    margin: 10,
    filename: nomeArquivo,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
  };
  
  loading(true);
  html2pdf().set(opcoes).from(elemento).save().then(() => {
    loading(false);
    toast('Relatório exportado com sucesso!', 'ok');
  }).catch(err => {
    loading(false);
    toast('Erro ao exportar PDF: ' + err.message, 'err');
    console.error(err);
  });
}

function toast(msg, tipo) {
  const t = document.createElement('div');
  t.className = `toast ${tipo}`;
  t.textContent = msg;
  document.getElementById('toasts').appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { 
    t.classList.remove('show'); 
    setTimeout(() => t.remove(), 280); 
  }, 3800);
}

function fmtPreco(v) {
  return Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function fmtData(data) {
  if (!data) return '—';
  const d = new Date(data);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${ano} ${hora}:${min}`;
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
