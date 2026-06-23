

// Sessão / Logout 
document.addEventListener('DOMContentLoaded', () => {
  try {
    const usr = JSON.parse(localStorage.getItem('usuarioLogado') || '{}');
    const el = document.getElementById('activeUserName');
    if (usr && usr.nome && el) el.textContent = usr.nome;
  } catch (e) {}

  const btnSair = document.getElementById('btnSair');
  if (btnSair) {
    btnSair.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('usuarioLogado');
      localStorage.removeItem('tokenSessao');
      window.location.href = 'login.html';
    });
  }
});

let itens          = [];
let estoques       = [];
let localizacoes   = [];
let produtos       = [];
let movTipo        = null;
let editandoEstId  = null;
let excluindoEstId = null;
let editandoLocId  = null;
let excluindoLocId = null;
let editandoItemId = null;
let excluindoItemId = null;

function setLoading(on) {
  document.getElementById('loading').style.display = on ? 'flex' : 'none';
}

function toast(msg, tipo = 'ok') {
  const wrap = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = `toast ${tipo}`;
  t.textContent = msg;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3200);
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getUsuarioLogadoId() {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuarioLogado') || '{}');
    const id = Number(usuario?.idUsuario);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch (_) {
    return null;
  }
}

function badgeStatus(quantidade, quantidade_min) {
  if (quantidade === 0)
    return `<span class="sku-tag" style="background:#fdecea;color:#c0392b">Sem estoque</span>`;
  if (quantidade <= quantidade_min)
    return `<span class="sku-tag" style="background:#fef3e2;color:#946a00">Estoque baixo</span>`;
  return `<span class="sku-tag" style="background:#e8f8ef;color:#1b6b31">Normal</span>`;
}

function renderEstoque(lista) {
  const wrap   = document.getElementById('tabelaEstoque');
  const rodape = document.getElementById('rodapeInfo');

  if (!lista.length) {
    wrap.innerHTML = `<div style="padding:52px 20px;text-align:center;color:var(--muted)">Nenhum item encontrado.</div>`;
    rodape.textContent = '';
    return;
  }

  const setores = {};
  lista.forEach(row => {
    const setor = row.setorLocalizacao || 'Sem setor';
    const locKey = `${row.idLocalizacao}__${row.idEstoque}`;
    if (!setores[setor]) setores[setor] = {};
    if (!setores[setor][locKey]) {
      setores[setor][locKey] = {
        idEstoque:       row.idEstoque,
        nomeEstoque:     row.nomeEstoque,
        nomeLocalizacao: row.nomeLocalizacao,
        itens: []
      };
    }
    if (row.idEstoque_Produto) {
      setores[setor][locKey].itens.push(row);
    }
  });

  let html = '';
  let totalItens = 0;

  Object.entries(setores).forEach(([setor, locs]) => {
    const setorId = `setor_${setor.replace(/\s+/g,'_')}`;
    html += `<div class="setor-bloco painel-tabela">`;
    html += `<div class="setor-titulo" onclick="toggleSetor('${setorId}')" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
      <span>${escHtml(setor)}</span>
      <span id="icone_${setorId}" style="font-size:12px;opacity:.7">▲</span>
    </div>`;
    html += `<div id="${setorId}" class="tabela-wrap"><table>`;
    html += `<thead><tr>
      <th>Estoque</th><th>Localização</th><th>Produto</th>
      <th>Qtd.</th><th>Qtd. Mín.</th><th>Status</th><th>Ações</th>
    </tr></thead><tbody>`;

    Object.values(locs).forEach(loc => {
      if (!loc.itens.length) {
        html += `<tr>
          <td class="td-nome">${escHtml(loc.nomeEstoque)}</td>
          <td class="td-desc">${escHtml(loc.nomeLocalizacao)}</td>
          <td colspan="5" style="color:var(--muted);font-size:13px;">Sem produtos cadastrados</td>
        </tr>`;
      } else {
        loc.itens.forEach((item) => {
          totalItens++;
          html += `<tr>
            <td class="td-nome">${escHtml(loc.nomeEstoque)}</td>
            <td class="td-desc">${escHtml(loc.nomeLocalizacao)}</td>
            <td class="td-nome">${escHtml(item.nomeProduto)}</td>
            <td class="td-preco">${item.quantidade}</td>
            <td class="td-un">${item.quantidade_min}</td>
            <td>${badgeStatus(item.quantidade, item.quantidade_min)}</td>
            <td class="td-acoes">
              <div class="acoes-grupo">
                <button class="btn-acao btn-editar" title="Editar item"
                  onclick="abrirEditarItem(${item.idEstoque_Produto}, '${escHtml(item.nomeProduto)}', ${item.quantidade_min})">
                  <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button class="btn-acao btn-excluir" title="Remover produto do estoque"
                  onclick="abrirExcluirItem(${item.idEstoque_Produto}, '${escHtml(item.nomeProduto)}')">
                  <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>`;
        });
      }
    });

    html += `</tbody></table></div></div>`;
  });

  wrap.innerHTML = html;
  rodape.textContent = `${totalItens} produto(s) em estoque`;
}

document.getElementById('iBusca').addEventListener('input', function () {
  const q = this.value.toLowerCase();
  renderEstoque(itens.filter(i =>
    (i.nomeProduto     || '').toLowerCase().includes(q) ||
    (i.nomeLocalizacao || '').toLowerCase().includes(q) ||
    (i.setorLocalizacao|| '').toLowerCase().includes(q) ||
    (i.nomeEstoque     || '').toLowerCase().includes(q)
  ));
});

async function carregarLocalizacoes() {
  try {
    localizacoes = await LocalizacaoAPI.listar();
    // Popula selects de localização
    ['iLocalizacao', 'eLocalizacao'].forEach(selId => {
      const sel = document.getElementById(selId);
      if (!sel) return;
      sel.innerHTML = `<option value="">— Selecione —</option>`;
      localizacoes.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.idLocalizacao;
        opt.textContent = `${l.nome} — ${l.setor}`;
        sel.appendChild(opt);
      });
    });
  } catch (_) { localizacoes = []; }
}

async function carregarProdutos() {
  try {
    const res = await ProdutoAPI.listar();
    produtos = res.dados || res;
    const sel = document.getElementById('iMovProduto');
    if (!sel) return;
    sel.innerHTML = `<option value="">— Selecione —</option>`;
    produtos.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.idProduto;
      opt.textContent = `${p.nome} (${p.sku})`;
      sel.appendChild(opt);
    });
  } catch (_) { produtos = []; }
}

async function carregarEstoques() {
  try {
    estoques = await EstoqueAPI.listarEstoques();
  } catch (_) { estoques = []; }
}

async function carregarEstoque() {
  setLoading(true);
  try {
    itens = await EstoqueAPI.listar();
    renderEstoque(itens);
  } catch (_) {
    document.getElementById('tabelaEstoque').innerHTML =
      `<div style="padding:52px 20px;text-align:center;color:var(--muted)">Erro ao carregar estoque.</div>`;
    toast('Erro ao carregar estoque.', 'err');
  } finally {
    setLoading(false);
  }
}

function abrirEditarItem(id, nome, qtdMin) {
  editandoItemId = id;
  document.getElementById('editItemNome').textContent = nome;
  document.getElementById('iEditQtdMin').value = qtdMin;
  document.getElementById('overlayEditItem').classList.add('on');
  document.getElementById('modalEditItem').classList.add('on');
}

function fecharEditarItem() {
  editandoItemId = null;
  document.getElementById('overlayEditItem').classList.remove('on');
  document.getElementById('modalEditItem').classList.remove('on');
}

document.getElementById('btnFecharEditItem').addEventListener('click', fecharEditarItem);
document.getElementById('btnCancelarEditItem').addEventListener('click', fecharEditarItem);
document.getElementById('overlayEditItem').addEventListener('click', fecharEditarItem);

document.getElementById('btnConfEditItem').addEventListener('click', async () => {
  if (!editandoItemId) return;
  const quantidade_min = parseInt(document.getElementById('iEditQtdMin').value) || 0;
  setLoading(true);
  try {
    await EstoqueAPI.atualizarItem(editandoItemId, { quantidade_min });
    toast('Item atualizado com sucesso!');
    fecharEditarItem();
    await carregarEstoque();
  } catch (_) {
    toast('Erro ao atualizar item.', 'err');
  } finally {
    setLoading(false);
  }
});

function abrirExcluirItem(id, nome) {
  excluindoItemId = id;
  document.getElementById('exNomeItem').textContent = nome;
  document.getElementById('overlayExItem').classList.add('on');
  document.getElementById('modalExItem').classList.add('on');
}

function fecharExcluirItem() {
  excluindoItemId = null;
  document.getElementById('overlayExItem').classList.remove('on');
  document.getElementById('modalExItem').classList.remove('on');
}

document.getElementById('btnCancelarExItem').addEventListener('click', fecharExcluirItem);
document.getElementById('overlayExItem').addEventListener('click', fecharExcluirItem);

document.getElementById('btnConfExItem').addEventListener('click', async () => {
  if (!excluindoItemId) return;
  setLoading(true);
  try {
    await EstoqueAPI.excluirItem(excluindoItemId);
    toast('Produto removido do estoque!');
    fecharExcluirItem();
    await carregarEstoque();
  } catch (_) {
    toast('Erro ao remover produto.', 'err');
  } finally {
    setLoading(false);
  }
});

document.getElementById('btnGerenciarEstoques').addEventListener('click', async () => {
  limparFormEst();
  document.getElementById('overlayEst').classList.add('on');
  document.getElementById('modalEst').classList.add('on');
  await renderTabelaEstoques();
});

function fecharModalEst() {
  document.getElementById('overlayEst').classList.remove('on');
  document.getElementById('modalEst').classList.remove('on');
  limparFormEst();
  carregarEstoques();
  carregarEstoque();
}

document.getElementById('btnFecharEst').addEventListener('click', fecharModalEst);
document.getElementById('overlayEst').addEventListener('click', fecharModalEst);

async function renderTabelaEstoques() {
  const tbody = document.getElementById('tbodyEst');
  tbody.innerHTML = `<tr><td colspan="5" class="td-vazio">Carregando...</td></tr>`;
  try {
    const lista = await EstoqueAPI.listarEstoques();
    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="td-vazio">Nenhum estoque cadastrado.</td></tr>`;
      return;
    }
    tbody.innerHTML = lista.map(e => `
      <tr>
        <td class="td-id">${e.idEstoque}</td>
        <td class="td-nome">${escHtml(e.nomeEstoque)}</td>
        <td class="td-desc">${escHtml(e.nomeLocalizacao)}</td>
        <td class="td-un">${escHtml(e.setorLocalizacao)}</td>
        <td class="td-acoes">
          <div class="acoes-grupo">
            <button class="btn-acao btn-editar" title="Editar" onclick="editarEst(${e.idEstoque})">
              <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn-acao btn-excluir" title="Excluir" onclick="confirmarExcluirEst(${e.idEstoque}, '${escHtml(e.nomeEstoque)}')">
              <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>`).join('');
  } catch (_) {
    tbody.innerHTML = `<tr><td colspan="5" class="td-vazio">Erro ao carregar estoques.</td></tr>`;
  }
}

function limparFormEst() {
  editandoEstId = null;
  document.getElementById('eNome').value = '';
  document.getElementById('eErroNome').textContent = '';
  document.getElementById('eNome').classList.remove('erro');
  document.getElementById('tituloFormEst').textContent = 'Novo Estoque';
  document.getElementById('eBtnCancelar').style.display = 'none';
  document.getElementById('eBtnSalvar').textContent = 'Salvar';
  document.getElementById('painelNovaLocEst').style.display = 'none';
  document.getElementById('eNovaLocNome').value = '';
  document.getElementById('eNovaLocSetor').value = '';
  document.getElementById('eErroNovaLocNome').textContent = '';
  const btnLoc = document.getElementById('btnNovaLocalizacaoEst');
  if (btnLoc) {
    btnLoc.textContent = '+ Nova localização';
    btnLoc.style.borderColor = '';
    btnLoc.style.color = '';
  }
  const hidden = document.getElementById('eLocalizacaoCriada');
  if (hidden) hidden.value = '';
}

async function editarEst(id) {
  try {
    const e = await EstoqueAPI.buscarEstoquePorId(id);
    editandoEstId = id;
    document.getElementById('eNome').value = e.nomeEstoque || '';
    document.getElementById('eLocalizacao').value = e.idLocalizacao || '';
    document.getElementById('tituloFormEst').textContent = 'Editar Estoque';
    document.getElementById('eBtnCancelar').style.display = '';
    document.getElementById('eBtnSalvar').textContent = 'Atualizar';
    document.getElementById('eNome').focus();
  } catch (_) { toast('Erro ao carregar estoque.', 'err'); }
}

document.getElementById('eBtnCancelar').addEventListener('click', limparFormEst);

document.getElementById('eBtnSalvar').addEventListener('click', async () => {
  const nome = document.getElementById('eNome').value.trim();
  let ok = true;

  if (!nome) {
    document.getElementById('eErroNome').textContent = 'Nome é obrigatório.';
    document.getElementById('eNome').classList.add('erro');
    ok = false;
  } else {
    document.getElementById('eErroNome').textContent = '';
    document.getElementById('eNome').classList.remove('erro');
  }

  // Se for novo estoque, exige que a localização tenha sido criada
  if (!editandoEstId && document.getElementById('painelNovaLocEst').style.display === 'none') {
    const locCriada = document.getElementById('eLocalizacaoCriada')?.value;
    if (!locCriada) {
      toast('Crie uma localização antes de salvar o estoque.', 'err');
      ok = false;
    }
  }

  if (!ok) return;

  document.getElementById('eBtnSalvar').disabled = true;
  try {
    const locCriada = parseInt(document.getElementById('eLocalizacaoCriada')?.value) || null;
    if (editandoEstId) {
      await EstoqueAPI.atualizar(editandoEstId, { nome, localizacao_id: locCriada });
      toast('Estoque atualizado com sucesso!');
    } else {
      await EstoqueAPI.criar({ nome, localizacao_id: locCriada });
      toast('Estoque criado com sucesso!');
    }
    limparFormEst();
    await renderTabelaEstoques();
    await carregarEstoques();
  } catch (err) {
    toast(err.message || 'Erro ao salvar estoque.', 'err');
  } finally {
    document.getElementById('eBtnSalvar').disabled = false;
  }
});

function toggleNovaLocalizacaoEst() {
  const painel = document.getElementById('painelNovaLocEst');
  const aberto = painel.style.display !== 'none';
  painel.style.display = aberto ? 'none' : '';
  if (!aberto) {
    document.getElementById('eNovaLocNome').value = '';
    document.getElementById('eNovaLocSetor').value = '';
    document.getElementById('eErroNovaLocNome').textContent = '';
    document.getElementById('eNovaLocNome').focus();
  }
}

async function salvarNovaLocalizacaoEst() {
  const nome  = document.getElementById('eNovaLocNome').value.trim();
  const setor = document.getElementById('eNovaLocSetor').value.trim();
  if (!nome || !setor) {
    document.getElementById('eErroNovaLocNome').textContent = 'Nome e setor são obrigatórios.';
    return;
  }
  document.getElementById('eBtnSalvarNovaLoc').disabled = true;
  try {
    const nova = await LocalizacaoAPI.criar({ nome, setor });
    toast('Localização criada!');
    await carregarLocalizacoes();

    // Guarda o id num campo hidden para usar ao salvar o estoque
    let hidden = document.getElementById('eLocalizacaoCriada');
    if (!hidden) {
      hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.id = 'eLocalizacaoCriada';
      document.getElementById('painelNovaLocEst').appendChild(hidden);
    }
    hidden.value = nova.idLocalizacao;

    // Mostra confirmação no botão
    document.getElementById('btnNovaLocalizacaoEst').textContent = `✓ ${nome} — ${setor}`;
    document.getElementById('btnNovaLocalizacaoEst').style.borderColor = '#1b6b31';
    document.getElementById('btnNovaLocalizacaoEst').style.color = '#1b6b31';

    toggleNovaLocalizacaoEst();
  } catch (err) {
    document.getElementById('eErroNovaLocNome').textContent = err.message || 'Erro ao criar localização.';
  } finally {
    document.getElementById('eBtnSalvarNovaLoc').disabled = false;
  }
}

function confirmarExcluirEst(id, nome) {
  excluindoEstId = id;
  document.getElementById('exNomeEst').textContent = nome;
  document.getElementById('overlayExEst').classList.add('on');
  document.getElementById('modalExEst').classList.add('on');
}

function fecharExcluirEst() {
  excluindoEstId = null;
  document.getElementById('overlayExEst').classList.remove('on');
  document.getElementById('modalExEst').classList.remove('on');
}

document.getElementById('eBtnCancelarEx').addEventListener('click', fecharExcluirEst);
document.getElementById('overlayExEst').addEventListener('click', fecharExcluirEst);

document.getElementById('eBtnConfEx').addEventListener('click', async () => {
  if (!excluindoEstId) return;
  setLoading(true);
  try {
    await EstoqueAPI.excluir(excluindoEstId);
    toast('Estoque excluído com sucesso!');
    fecharExcluirEst();
    await renderTabelaEstoques();
    await carregarEstoques();
    await carregarEstoque();
  } catch (err) {
    toast(err.message || 'Erro ao excluir estoque.', 'err');
    fecharExcluirEst();
  } finally {
    setLoading(false);
  }
});

document.getElementById('btnMovimentacao').addEventListener('click', () => {
  movTipo = null;
  document.getElementById('movTitulo').textContent = 'Movimentação';
  document.getElementById('iMovProduto').value = '';
  document.getElementById('iMovEstoque').innerHTML  = `<option value="">— Selecione —</option>`;
  document.getElementById('iMovLocalizacao').innerHTML = `<option value="">— Selecione —</option>`;
  document.getElementById('iMovDestino').innerHTML  = `<option value="">— Selecione —</option>`;
  document.getElementById('iMovLocalizacaoDestino').innerHTML = `<option value="">— Selecione —</option>`;
  document.getElementById('iMovQtd').value = '';
  document.getElementById('iMovObs').value = '';
  document.getElementById('iMovQtdMin').value = '';
  document.getElementById('movInfoEstoque').textContent = '';
  document.getElementById('campoMovDestino').style.display = 'none';
  document.getElementById('campoMovLocalizacao').style.display = 'none';
  document.getElementById('campoMovLocalizacaoDestino').style.display = 'none';
  document.getElementById('campoQtdMin').style.display = 'none';
  document.getElementById('labelMovEstoque').innerHTML = 'Estoque <span class="req">*</span>';
  ['erroMovProduto','erroMovEstoque','erroMovLocalizacao','erroMovDestino','erroMovLocalizacaoDestino','erroMovQtd'].forEach(id => {
    document.getElementById(id).textContent = '';
  });
  resetBotoesTipo();
  document.getElementById('overlayMov').classList.add('on');
  document.getElementById('modalMov').classList.add('on');
});

function fecharMovimentacao() {
  movTipo = null;
  document.getElementById('overlayMov').classList.remove('on');
  document.getElementById('modalMov').classList.remove('on');
}

document.getElementById('btnFecharMov').addEventListener('click', fecharMovimentacao);
document.getElementById('btnCancelarMov').addEventListener('click', fecharMovimentacao);
document.getElementById('overlayMov').addEventListener('click', fecharMovimentacao);

function resetBotoesTipo() {
  ['btnTipoEntrada','btnTipoSaida','btnTipoTransferencia'].forEach(id => {
    document.getElementById(id).style.opacity = '1';
  });
}

function selecionarTipo(tipo) {
  movTipo = tipo;
  resetBotoesTipo();
  document.getElementById(`btnTipo${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`).style.opacity = '0.7';

  const titulos = { entrada: 'Entrada', saida: 'Saída', transferencia: 'Transferência' };
  document.getElementById('movTitulo').textContent = titulos[tipo];
  document.getElementById('campoMovDestino').style.display = tipo === 'transferencia' ? '' : 'none';
  document.getElementById('campoQtdMin').style.display = tipo === 'entrada' ? '' : 'none';
  const labelOrigem = tipo === 'transferencia' ? 'Estoque de Origem' : 'Estoque';
  document.getElementById('labelMovEstoque').innerHTML = `${labelOrigem} <span class="req">*</span>`;

  document.getElementById('iMovEstoque').innerHTML = `<option value="">— Selecione —</option>`;
  document.getElementById('iMovLocalizacao').innerHTML = `<option value="">— Selecione —</option>`;
  document.getElementById('iMovLocalizacaoDestino').innerHTML = `<option value="">— Selecione —</option>`;
  document.getElementById('campoMovLocalizacao').style.display = 'none';
  document.getElementById('campoMovLocalizacaoDestino').style.display = 'none';
  document.getElementById('movInfoEstoque').textContent = '';

  onChangeProdutoMov();
}

function onChangeProdutoMov() {
  const produto_id = parseInt(document.getElementById('iMovProduto').value);
  const sel = document.getElementById('iMovEstoque');
  sel.innerHTML = `<option value="">— Selecione —</option>`;
  document.getElementById('iMovLocalizacao').innerHTML = `<option value="">— Selecione —</option>`;
  document.getElementById('campoMovLocalizacao').style.display = 'none';
  document.getElementById('movInfoEstoque').textContent = '';

  if (!produto_id || !movTipo) return;

  if (movTipo === 'entrada') {
    const vistos = new Set();
    estoques.forEach(e => {
      if (!vistos.has(e.idEstoque)) {
        vistos.add(e.idEstoque);
        const opt = document.createElement('option');
        opt.value = e.idEstoque;
        opt.textContent = e.nomeEstoque;
        sel.appendChild(opt);
      }
    });
  } else {
    const vistos = new Set();
    itens.filter(i => i.produto_id === produto_id && i.idEstoque_Produto).forEach(i => {
      if (!vistos.has(i.idEstoque)) {
        vistos.add(i.idEstoque);
        const opt = document.createElement('option');
        opt.value = i.idEstoque;
        opt.textContent = i.nomeEstoque;
        sel.appendChild(opt);
      }
    });
  }
}

function onChangeEstoqueMov() {
  const produto_id = parseInt(document.getElementById('iMovProduto').value);
  const estoque_id = parseInt(document.getElementById('iMovEstoque').value);
  const selLoc = document.getElementById('iMovLocalizacao');

  selLoc.innerHTML = `<option value="">— Selecione —</option>`;
  document.getElementById('movInfoEstoque').textContent = '';
  document.getElementById('campoMovLocalizacao').style.display = 'none';

  if (!estoque_id || !movTipo) return;

  const nomeEstoque = estoques.find(e => e.idEstoque === estoque_id)?.nomeEstoque || '';
  const locsFiltradas = localizacoes.filter(l => l.setor.toLowerCase() === nomeEstoque.toLowerCase());
  const locsParaMostrar = locsFiltradas.length ? locsFiltradas : localizacoes;

  locsParaMostrar.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l.idLocalizacao;
    opt.textContent = `${l.nome} — ${l.setor}`;
    selLoc.appendChild(opt);
  });

  document.getElementById('campoMovLocalizacao').style.display = '';
  if (locsParaMostrar.length === 1) {
    selLoc.value = locsParaMostrar[0].idLocalizacao;
    onChangeLocalizacaoMov();
  }

  if (movTipo === 'transferencia') {
    const sel = document.getElementById('iMovDestino');
    sel.innerHTML = `<option value="">— Selecione —</option>`;
    document.getElementById('iMovLocalizacaoDestino').innerHTML = `<option value="">— Selecione —</option>`;
    document.getElementById('campoMovLocalizacaoDestino').style.display = 'none';
    const vistos = new Set([estoque_id]);
    estoques.filter(e => !vistos.has(e.idEstoque)).forEach(e => {
      vistos.add(e.idEstoque);
      const opt = document.createElement('option');
      opt.value = e.idEstoque;
      opt.textContent = e.nomeEstoque;
      sel.appendChild(opt);
    });
  }
}

function onChangeLocalizacaoMov() {
  const produto_id = parseInt(document.getElementById('iMovProduto').value);
  const estoque_id = parseInt(document.getElementById('iMovEstoque').value);
  const item = itens.find(i => i.produto_id === produto_id && i.idEstoque === estoque_id);
  document.getElementById('movInfoEstoque').textContent =
    item ? `Quantidade disponível: ${item.quantidade}` :
    movTipo === 'entrada' ? 'Produto novo neste estoque' : '';
}

function onChangeDestineMov() {
  const selLoc = document.getElementById('iMovLocalizacaoDestino');
  selLoc.innerHTML = `<option value="">— Selecione —</option>`;
  document.getElementById('campoMovLocalizacaoDestino').style.display = 'none';

  const estoque_id = parseInt(document.getElementById('iMovDestino').value);
  if (!estoque_id) return;

  const nomeEstoque = estoques.find(e => e.idEstoque === estoque_id)?.nomeEstoque || '';
  const locsFiltradas = localizacoes.filter(l => l.setor.toLowerCase() === nomeEstoque.toLowerCase());
  const locsParaMostrar = locsFiltradas.length ? locsFiltradas : localizacoes;

  locsParaMostrar.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l.idLocalizacao;
    opt.textContent = `${l.nome} — ${l.setor}`;
    selLoc.appendChild(opt);
  });

  document.getElementById('campoMovLocalizacaoDestino').style.display = '';
  if (locsParaMostrar.length === 1) selLoc.value = locsParaMostrar[0].idLocalizacao;
}

document.getElementById('btnConfMov').addEventListener('click', async () => {
  if (!movTipo) { toast('Selecione o tipo de movimentação.', 'err'); return; }

  const produto_id = document.getElementById('iMovProduto').value;
  const estoque_id = document.getElementById('iMovEstoque').value;
  const qtd        = parseInt(document.getElementById('iMovQtd').value);
  const obs        = document.getElementById('iMovObs').value || null;
  const qtdMin     = parseInt(document.getElementById('iMovQtdMin').value) || 0;
  const usuarioId  = getUsuarioLogadoId();
  let ok = true;

  if (!produto_id) { document.getElementById('erroMovProduto').textContent = 'Selecione um produto.'; ok = false; }
  else { document.getElementById('erroMovProduto').textContent = ''; }
  if (!estoque_id) { document.getElementById('erroMovEstoque').textContent = 'Selecione um estoque.'; ok = false; }
  else { document.getElementById('erroMovEstoque').textContent = ''; }
  if (!document.getElementById('iMovLocalizacao').value) {
    document.getElementById('erroMovLocalizacao').textContent = 'Selecione uma localização.'; ok = false;
  } else { document.getElementById('erroMovLocalizacao').textContent = ''; }
  if (movTipo === 'transferencia' && !document.getElementById('iMovDestino').value) {
    document.getElementById('erroMovDestino').textContent = 'Selecione o estoque de destino.'; ok = false;
  } else { document.getElementById('erroMovDestino').textContent = ''; }
  if (movTipo === 'transferencia' && !document.getElementById('iMovLocalizacaoDestino').value) {
    document.getElementById('erroMovLocalizacaoDestino').textContent = 'Selecione a localização de destino.'; ok = false;
  } else { document.getElementById('erroMovLocalizacaoDestino').textContent = ''; }
  if (!qtd || qtd <= 0) { document.getElementById('erroMovQtd').textContent = 'Informe uma quantidade válida.'; ok = false; }
  else { document.getElementById('erroMovQtd').textContent = ''; }
  if (!usuarioId) { toast('Sessão inválida. Faça login novamente para registrar movimentações.', 'err'); ok = false; }

  if (!ok) return;

  document.getElementById('btnConfMov').disabled = true;
  setLoading(true);
  try {
    if (movTipo === 'entrada') {
      await MovimentacaoAPI.entrada({ produto_id: parseInt(produto_id), estoque_id: parseInt(estoque_id), quantidade: qtd, quantidade_min: qtdMin, observacao: obs, usuario_id: usuarioId });
      toast('Entrada registrada com sucesso!');
    } else if (movTipo === 'saida') {
      await MovimentacaoAPI.saida({ produto_id: parseInt(produto_id), estoque_id: parseInt(estoque_id), quantidade: qtd, observacao: obs, usuario_id: usuarioId });
      toast('Saída registrada com sucesso!');
    } else {
      await MovimentacaoAPI.transferencia({ produto_id: parseInt(produto_id), estoque_origem_id: parseInt(estoque_id), estoque_destino_id: parseInt(document.getElementById('iMovDestino').value), quantidade: qtd, observacao: obs, usuario_id: usuarioId });
      toast('Transferência realizada com sucesso!');
    }
    fecharMovimentacao();
    await carregarEstoques();
    await carregarEstoque();
  } catch (err) {
    toast(err.message || 'Erro ao registrar movimentação.', 'err');
  } finally {
    document.getElementById('btnConfMov').disabled = false;
    setLoading(false);
  }
});

document.getElementById('btnGerenciarLocalizacoes').addEventListener('click', async () => {
  document.getElementById('overlayLoc').classList.add('on');
  document.getElementById('modalLoc').classList.add('on');
  await renderTabelaLocalizacoes();
});

function fecharModalLoc() {
  document.getElementById('overlayLoc').classList.remove('on');
  document.getElementById('modalLoc').classList.remove('on');
  limparFormLoc();
  carregarLocalizacoes();
}

document.getElementById('btnFecharLoc').addEventListener('click', fecharModalLoc);
document.getElementById('overlayLoc').addEventListener('click', fecharModalLoc);

async function renderTabelaLocalizacoes() {
  const tbody = document.getElementById('tbodyLoc');
  tbody.innerHTML = `<tr><td colspan="4" class="td-vazio">Carregando...</td></tr>`;
  try {
    const lista = await LocalizacaoAPI.listar();
    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="td-vazio">Nenhuma localização cadastrada.</td></tr>`;
      return;
    }
    tbody.innerHTML = lista.map(l => `
      <tr>
        <td class="td-id">${l.idLocalizacao}</td>
        <td class="td-nome">${escHtml(l.nome)}</td>
        <td class="td-desc">${escHtml(l.setor)}</td>
        <td class="td-acoes">
          <div class="acoes-grupo">
            <button class="btn-acao btn-editar" title="Editar" onclick="editarLoc(${l.idLocalizacao})">
              <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn-acao btn-excluir" title="Excluir" onclick="confirmarExcluirLoc(${l.idLocalizacao}, '${escHtml(l.nome)}')">
              <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>`).join('');
  } catch (_) {
    tbody.innerHTML = `<tr><td colspan="4" class="td-vazio">Erro ao carregar localizações.</td></tr>`;
  }
}

function limparFormLoc() {
  editandoLocId = null;
  document.getElementById('lNome').value  = '';
  document.getElementById('lSetor').value = '';
  document.getElementById('lErroNome').textContent  = '';
  document.getElementById('lErroSetor').textContent = '';
  document.getElementById('lNome').classList.remove('erro');
  document.getElementById('lSetor').classList.remove('erro');
  document.getElementById('tituloFormLoc').textContent = 'Nova Localização';
  document.getElementById('lBtnCancelar').style.display = 'none';
  document.getElementById('lBtnSalvar').textContent = 'Salvar';
}


async function editarLoc(id) {
  try {
    const l = await LocalizacaoAPI.porId(id);
    editandoLocId = id;
    document.getElementById('lNome').value  = l.nome  || '';
    document.getElementById('lSetor').value = l.setor || '';
    document.getElementById('tituloFormLoc').textContent = 'Editar Localização';
    document.getElementById('lBtnCancelar').style.display = '';
    document.getElementById('lBtnSalvar').textContent = 'Atualizar';
    document.getElementById('lNome').focus();
  } catch (_) { toast('Erro ao carregar localização.', 'err'); }
}

document.getElementById('lBtnCancelar').addEventListener('click', limparFormLoc);

document.getElementById('lBtnSalvar').addEventListener('click', async () => {
  const nome  = document.getElementById('lNome').value.trim();
  const setor = document.getElementById('lSetor').value.trim();
  let ok = true;
  if (!nome) { document.getElementById('lErroNome').textContent = 'Nome é obrigatório.'; document.getElementById('lNome').classList.add('erro'); ok = false; }
  else { document.getElementById('lErroNome').textContent = ''; document.getElementById('lNome').classList.remove('erro'); }
  if (!setor) { document.getElementById('lErroSetor').textContent = 'Setor é obrigatório.'; document.getElementById('lSetor').classList.add('erro'); ok = false; }
  else { document.getElementById('lErroSetor').textContent = ''; document.getElementById('lSetor').classList.remove('erro'); }
  if (!ok) return;

  document.getElementById('lBtnSalvar').disabled = true;
  try {
    if (editandoLocId) {
      await LocalizacaoAPI.atualizar(editandoLocId, { nome, setor });
      toast('Localização atualizada com sucesso!');
    } else {
      await LocalizacaoAPI.criar({ nome, setor });
      toast('Localização cadastrada com sucesso!');
    }
    limparFormLoc();
    await renderTabelaLocalizacoes();
    await carregarLocalizacoes();
  } catch (err) {
    toast(err.message || 'Erro ao salvar localização.', 'err');
  } finally {
    document.getElementById('lBtnSalvar').disabled = false;
  }
});

function confirmarExcluirLoc(id, nome) {
  excluindoLocId = id;
  document.getElementById('exNomeLoc').textContent = nome;
  document.getElementById('overlayExLoc').classList.add('on');
  document.getElementById('modalExLoc').classList.add('on');
}

function fecharExcluirLoc() {
  excluindoLocId = null;
  document.getElementById('overlayExLoc').classList.remove('on');
  document.getElementById('modalExLoc').classList.remove('on');
}

document.getElementById('lBtnCancelarEx').addEventListener('click', fecharExcluirLoc);
document.getElementById('overlayExLoc').addEventListener('click', fecharExcluirLoc);

document.getElementById('lBtnConfEx').addEventListener('click', async () => {
  if (!excluindoLocId) return;
  setLoading(true);
  try {
    await LocalizacaoAPI.excluir(excluindoLocId);
    toast('Localização excluída com sucesso!');
    fecharExcluirLoc();
    await renderTabelaLocalizacoes();
    await carregarLocalizacoes();
  } catch (err) {
    toast(err.message || 'Erro ao excluir localização.', 'err');
    fecharExcluirLoc();
  } finally {
    setLoading(false);
  }
});

function toggleSetor(id) {
  const tabela = document.getElementById(id);
  const icone  = document.getElementById('icone_' + id);
  if (!tabela) return;
  const visivel = tabela.style.display !== 'none';
  tabela.style.display = visivel ? 'none' : '';
  if (icone) icone.textContent = visivel ? '▼' : '▲';
}

(async () => {
  await carregarLocalizacoes();
  await carregarProdutos();
  await carregarEstoques();
  await carregarEstoque();
})();