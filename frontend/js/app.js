/* ── Estado ── */
const S = {
  pagina: 1,
  limite: 50,
  busca: '',
  categoria: '',
  editandoId: null,
};

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  const elActiveUserName = document.getElementById('activeUserName');
  const elRodapeInfo = document.getElementById('rodapeInfo');
  const elTbody = document.getElementById('tbody');

  // Exibir nome do usuário ativo logado no sistema
  try {
    const usr = JSON.parse(localStorage.getItem('usuarioLogado') || '{}');
    if (usr && usr.nome && elActiveUserName) {
      elActiveUserName.textContent = usr.nome;
    }
  } catch (e) {
    console.error('Erro ao ler dados da sessão:', e);
  }

  // Ação de logout (Sair)
  const btnSair = document.getElementById('btnSair');
  if (btnSair) {
    btnSair.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('usuarioLogado');
      localStorage.removeItem('tokenSessao');
      toast('Sessão encerrada com sucesso! Até logo.', 'warn');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1000);
    });
  }

  // Se estiver no dashboard (sem tabela de produtos), apenas carrega o resumo e encerra.
  if (!elTbody) {
    if (elRodapeInfo) carregarResumoDashboard();
    return;
  }

  carregar();

  // filtros
  let deb;
  document.getElementById('iBusca').addEventListener('input', e => {
    clearTimeout(deb);
    deb = setTimeout(() => { S.busca = e.target.value.trim(); S.pagina = 1; carregar(); }, 380);
  });
  document.getElementById('sCategoria').addEventListener('change', e => {
    S.categoria = e.target.value; S.pagina = 1; carregar();
  });

  // modal criar/editar
  document.getElementById('btnNovo').addEventListener('click', abrirNovo);
  document.getElementById('btnCancelar').addEventListener('click', fecharModal);
  document.getElementById('btnCancelarH').addEventListener('click', fecharModal);
  document.getElementById('overlay').addEventListener('click', fecharModal);
  document.getElementById('fProduto').addEventListener('submit', salvar);

  // modal excluir
  document.getElementById('btnCancelarEx').addEventListener('click', fecharEx);
  document.getElementById('overlayEx').addEventListener('click', fecharEx);
  document.getElementById('btnConfEx').addEventListener('click', confirmarExcluir);
});

async function carregarResumoDashboard() {
  const info = document.getElementById('rodapeInfo');
  const cardTotalProdutos = document.getElementById('cardTotalProdutos');
  const cardCategorias = document.getElementById('cardCategorias');
  const cardProdutoMaisCaro = document.getElementById('cardProdutoMaisCaro');

  try {
    const { total } = await ProdutoAPI.listar({ pagina: 1, limite: 1 });

    if (info) {
      info.textContent =
        total === 0 ? 'Nenhum produto encontrado' : `${total} produto${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`;
    }

    if (cardTotalProdutos) {
      cardTotalProdutos.textContent = total ?? '—';
    }

    if (cardCategorias || cardProdutoMaisCaro) {
      try {
        const data = await DashboardAPI.obterDados();
        const cards = data?.cards || {};

        if (cardCategorias) {
          cardCategorias.textContent = cards.totalCategorias ?? '—';
        }

        if (cardProdutoMaisCaro) {
          if (cards.produtoMaisCaro?.preco != null) {
            cardProdutoMaisCaro.textContent = `R$ ${fmtPreco(cards.produtoMaisCaro.preco)}`;
            cardProdutoMaisCaro.title = cards.produtoMaisCaro.nome || '';
          } else {
            cardProdutoMaisCaro.textContent = '—';
          }
        }
      } catch (dashErr) {
        console.warn('Não foi possível carregar os cards do dashboard:', dashErr);
        if (cardCategorias) cardCategorias.textContent = '—';
        if (cardProdutoMaisCaro) cardProdutoMaisCaro.textContent = '—';
      }
    }
  } catch (e) {
    if (info) info.textContent = 'Erro ao carregar produtos';
    if (cardTotalProdutos) cardTotalProdutos.textContent = '—';
    if (cardCategorias) cardCategorias.textContent = '—';
    if (cardProdutoMaisCaro) cardProdutoMaisCaro.textContent = '—';
    console.error(e);
  }
}

/* ── Carregar / Renderizar ── */
async function carregar() {
  loading(true);
  try {
    const p = { pagina: S.pagina, limite: S.limite };
    if (S.busca)     p.busca     = S.busca;
    if (S.categoria) p.categoria = S.categoria;

    const { dados, total } = await ProdutoAPI.listar(p);
    renderTabela(dados, total);
  } catch (e) {
    toast(e.message, 'err');
  } finally {
    loading(false);
  }
}

function renderTabela(lista, total) {
  const tbody = document.getElementById('tbody');

  document.getElementById('rodapeInfo').textContent =
    total === 0 ? 'Nenhum produto encontrado' : `${total} produto${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`;

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="td-vazio">Nenhum produto encontrado</td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(p => `
    <tr>
      <td class="td-id">${p.idProduto}</td>
      <td class="td-sku"><span class="sku-tag">${esc(p.sku)}</span></td>
      <td class="td-nome">${esc(p.nome)}</td>
      <td class="td-desc">${esc(p.descricao || '—')}</td>
      <td class="td-preco">R$ ${fmtPreco(p.preco)}</td>
      <td>${esc(p.categoria || '—')}</td>
      <td>${esc(p.marca || '—')}</td>
      <td class="td-un">${esc(p.unidadeMedida || '—')}</td>
      <td><span style="font-weight: 600; color: ${p.estoque < 5 ? '#c0392b' : 'inherit'}">${p.estoque ?? 0}</span></td>
      <td class="td-acoes">
        <div class="acoes-grupo">
          <button class="btn-acao btn-editar" onclick="abrirEditar(${p.idProduto})" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-acao btn-excluir" onclick="pedirExcluir(${p.idProduto},'${esc(p.nome)}')" title="Excluir">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>`).join('');
}

/* ── Modal Criar ── */
function abrirNovo() {
  S.editandoId = null;
  document.getElementById('modalTitulo').textContent = 'Novo Produto';
  document.getElementById('fProduto').reset();
  limparErros();
  abrirModal();
}

/* ── Modal Editar ── */
async function abrirEditar(id) {
  loading(true);
  try {
    const p = await ProdutoAPI.porId(id);
    S.editandoId = id;
    document.getElementById('modalTitulo').textContent = 'Editar Produto';
    document.getElementById('iSku').value       = p.sku        || '';
    document.getElementById('iNome').value      = p.nome       || '';
    document.getElementById('iDescricao').value = p.descricao  || '';
    document.getElementById('iPreco').value     = p.preco      || '';
    document.getElementById('iCategoria').value = p.categoria  || '';
    document.getElementById('iMarca').value     = p.marca      || '';
    document.getElementById('iUnidade').value   = p.unidadeMedida || '';
    document.getElementById('iEstoque').value   = p.estoque ?? 0;
    limparErros();
    abrirModal();
  } catch (e) {
    toast(e.message, 'err');
  } finally {
    loading(false);
  }
}

/* ── Salvar ── */
async function salvar(e) {
  e.preventDefault();
  limparErros();

  const dados = {
    sku:           document.getElementById('iSku').value.trim(),
    nome:          document.getElementById('iNome').value.trim(),
    descricao:     document.getElementById('iDescricao').value.trim(),
    preco:         parseFloat(document.getElementById('iPreco').value),
    categoria:     document.getElementById('iCategoria').value.trim(),
    marca:         document.getElementById('iMarca').value.trim(),
    unidadeMedida: document.getElementById('iUnidade').value.trim(),
    estoque:       parseInt(document.getElementById('iEstoque').value) || 0,
  };

  let ok = true;
  if (!dados.sku)                 { marcaErro('iSku',   'SKU obrigatório');    ok = false; }
  if (!dados.nome)                { marcaErro('iNome',  'Nome obrigatório');   ok = false; }
  if (!dados.preco || dados.preco <= 0) { marcaErro('iPreco', 'Preço inválido'); ok = false; }
  if (!ok) return;

  const btn = document.getElementById('btnSalvar');
  btn.disabled = true; btn.textContent = 'Salvando…';

  try {
    if (S.editandoId) {
      await ProdutoAPI.atualizar(S.editandoId, dados);
      toast('Produto atualizado com sucesso!', 'ok');
    } else {
      await ProdutoAPI.criar(dados);
      toast('Produto cadastrado com sucesso!', 'ok');
    }
    fecharModal();
    carregar();
  } catch (e) {
    toast(e.message, 'err');
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar';
  }
}

/* ── Excluir ── */
let _exId = null;

function pedirExcluir(id, nome) {
  _exId = id;
  document.getElementById('exNome').textContent = nome;
  document.getElementById('modalEx').classList.add('on');
  document.getElementById('overlayEx').classList.add('on');
}

function fecharEx() {
  _exId = null;
  document.getElementById('modalEx').classList.remove('on');
  document.getElementById('overlayEx').classList.remove('on');
}

async function confirmarExcluir() {
  if (!_exId) return;
  try {
    await ProdutoAPI.excluir(_exId);
    toast('Produto excluído!', 'ok');
    fecharEx();
    carregar();
  } catch (e) {
    toast(e.message, 'err');
  }
}

/* ── UI helpers ── */
function abrirModal() {
  document.getElementById('modal').classList.add('on');
  document.getElementById('overlay').classList.add('on');
  setTimeout(() => document.getElementById('iSku').focus(), 80);
}
function fecharModal() {
  document.getElementById('modal').classList.remove('on');
  document.getElementById('overlay').classList.remove('on');
}
function loading(s) { document.getElementById('loading').style.display = s ? 'flex' : 'none'; }

function toast(msg, tipo) {
  const t = document.createElement('div');
  t.className = `toast ${tipo}`;
  t.textContent = msg;
  document.getElementById('toasts').appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 280); }, 3800);
}

function marcaErro(id, msg) {
  const el = document.getElementById(id);
  el.classList.add('erro');
  const sp = document.createElement('span');
  sp.className = 'msg-erro'; sp.textContent = msg;
  el.parentNode.appendChild(sp);
}
function limparErros() {
  document.querySelectorAll('.erro').forEach(e => e.classList.remove('erro'));
  document.querySelectorAll('.msg-erro').forEach(e => e.remove());
}

function fmtPreco(v) {
  return Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}