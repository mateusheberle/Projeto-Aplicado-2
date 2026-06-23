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

let usuarios    = [];
let perfis      = [];
let editandoId  = null;
let excluindoId = null;

// Utilitários 
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

// Renderização da tabela 
function renderTabela(lista) {
  const tbody  = document.getElementById('tbody');
  const rodape = document.getElementById('rodapeInfo');

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="td-vazio">Nenhum usuário encontrado.</td></tr>`;
    rodape.textContent = '';
    return;
  }

  tbody.innerHTML = lista.map(u => {
    const tagsPerfis = (u.perfis && u.perfis.length)
      ? u.perfis.map(p => `<span class="sku-tag" style="margin-right:4px">${escHtml(p.nome)}</span>`).join('')
      : `<span style="color:var(--muted);font-size:13px">—</span>`;

    return `
      <tr>
        <td class="td-id">${u.idUsuario}</td>
        <td class="td-nome">${escHtml(u.nome)}</td>
        <td class="td-desc">${escHtml(u.email)}</td>
        <td>${tagsPerfis}</td>
        <td class="td-acoes">
          <div class="acoes-grupo">
            <button class="btn-acao btn-editar" title="Editar" onclick="abrirEditar(${u.idUsuario})">
              <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn-acao btn-excluir" title="Excluir" onclick="abrirExcluir(${u.idUsuario}, '${escHtml(u.nome)}')">
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
  }).join('');

  rodape.textContent = `${lista.length} usuário(s) encontrado(s)`;
}

// Checkboxes de perfis no modal 
function renderPerfisCheck(selecionados = []) {
  const wrap = document.getElementById('listaPerfisCheck');
  if (!perfis.length) {
    wrap.innerHTML = `<span style="color:var(--muted);font-size:13px">Nenhum perfil cadastrado.</span>`;
    return;
  }
  wrap.innerHTML = perfis.map(p => `
    <label style="display:flex;align-items:center;gap:8px;font-weight:400;font-size:13.5px;cursor:pointer">
      <input type="checkbox" name="perfil" value="${p.idPerfil}"
        ${selecionados.includes(p.idPerfil) ? 'checked' : ''}
        style="width:15px;height:15px;accent-color:var(--azul);cursor:pointer" />
      ${escHtml(p.nome)}
      <span style="color:var(--muted);font-size:12px">(${escHtml(p.permissao || '')})</span>
    </label>
  `).join('');
}

// Busca em tempo real 
document.getElementById('iBusca').addEventListener('input', function () {
  const q = this.value.toLowerCase();
  renderTabela(usuarios.filter(u =>
    u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  ));
});

// Carregar dados 
async function carregarPerfis() {
  try {
    perfis = await PerfilAPI.listar();
  } catch (_) { perfis = []; }
}

async function carregarUsuarios() {
  setLoading(true);
  try {
    usuarios = await UsuarioAPI.listar();
    renderTabela(usuarios);
  } catch (_) {
    document.getElementById('tbody').innerHTML =
      `<tr><td colspan="5" class="td-vazio">Erro ao carregar usuários.</td></tr>`;
    toast('Erro ao carregar usuários.', 'err');
  } finally {
    setLoading(false);
  }
}

// Modal 
function abrirModal() {
  document.getElementById('overlay').classList.add('on');
  document.getElementById('modal').classList.add('on');
}

function fecharModal() {
  document.getElementById('overlay').classList.remove('on');
  document.getElementById('modal').classList.remove('on');
  limparForm();
  editandoId = null;
}

function limparForm() {
  ['iNome','iEmail','iSenha'].forEach(id => {
    document.getElementById(id).value = '';
    document.getElementById(id).classList.remove('erro');
  });
  ['erroNome','erroEmail','erroSenha'].forEach(id => {
    document.getElementById(id).textContent = '';
  });
}

// Novo usuário 
document.getElementById('btnNovo').addEventListener('click', () => {
  editandoId = null;
  document.getElementById('modalTitulo').textContent = 'Novo Usuário';
  document.getElementById('iSenha').placeholder = 'Mínimo 6 caracteres';
  limparForm();
  renderPerfisCheck([]);
  abrirModal();
});

// Editar usuário 
async function abrirEditar(id) {
  editandoId = id;
  document.getElementById('modalTitulo').textContent = 'Editar Usuário';
  document.getElementById('iSenha').placeholder = 'Deixe em branco para manter a atual';

  setLoading(true);
  try {
    const u = await UsuarioAPI.porId(id);
    document.getElementById('iNome').value  = u.nome  || '';
    document.getElementById('iEmail').value = u.email || '';
    renderPerfisCheck((u.perfis || []).map(p => p.idPerfil));
    abrirModal();
  } catch (_) {
    toast('Erro ao carregar dados do usuário.', 'err');
  } finally {
    setLoading(false);
  }
}

['btnCancelar','btnCancelarH'].forEach(id => {
  document.getElementById(id).addEventListener('click', fecharModal);
});
document.getElementById('overlay').addEventListener('click', fecharModal);

// Validação 
function validar() {
  let ok = true;
  const nome  = document.getElementById('iNome').value.trim();
  const email = document.getElementById('iEmail').value.trim();
  const senha = document.getElementById('iSenha').value;

  if (!nome) {
    document.getElementById('erroNome').textContent = 'Nome é obrigatório.';
    document.getElementById('iNome').classList.add('erro');
    ok = false;
  } else {
    document.getElementById('erroNome').textContent = '';
    document.getElementById('iNome').classList.remove('erro');
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById('erroEmail').textContent = 'Informe um e-mail válido.';
    document.getElementById('iEmail').classList.add('erro');
    ok = false;
  } else {
    document.getElementById('erroEmail').textContent = '';
    document.getElementById('iEmail').classList.remove('erro');
  }

  if (!editandoId && senha.length < 6) {
    document.getElementById('erroSenha').textContent = 'Senha deve ter no mínimo 6 caracteres.';
    document.getElementById('iSenha').classList.add('erro');
    ok = false;
  } else if (editandoId && senha && senha.length < 6) {
    document.getElementById('erroSenha').textContent = 'Se informar senha, deve ter no mínimo 6 caracteres.';
    document.getElementById('iSenha').classList.add('erro');
    ok = false;
  } else {
    document.getElementById('erroSenha').textContent = '';
    document.getElementById('iSenha').classList.remove('erro');
  }

  return ok;
}

// Salvar 
document.getElementById('btnSalvar').addEventListener('click', async () => {
  if (!validar()) return;

  const nome  = document.getElementById('iNome').value.trim();
  const email = document.getElementById('iEmail').value.trim();
  const senha = document.getElementById('iSenha').value;
  const checkboxes = document.querySelectorAll('#listaPerfisCheck input[name="perfil"]:checked');
  const perfisSelecionados = Array.from(checkboxes).map(c => parseInt(c.value));

  const body = { nome, email, perfis: perfisSelecionados };
  if (senha) body.senha = senha;

  document.getElementById('btnSalvar').disabled = true;
  setLoading(true);
  try {
    if (editandoId) {
      await UsuarioAPI.atualizar(editandoId, body);
    } else {
      await UsuarioAPI.criar(body);
    }
    toast(editandoId ? 'Usuário atualizado com sucesso!' : 'Usuário cadastrado com sucesso!');
    fecharModal();
    await carregarUsuarios();
  } catch (err) {
    const msg = err.message || '';
    if (msg.toLowerCase().includes('e-mail') || msg.toLowerCase().includes('email')) {
      document.getElementById('erroEmail').textContent = 'Este e-mail já está cadastrado.';
      document.getElementById('iEmail').classList.add('erro');
    } else {
      toast('Erro ao salvar usuário.', 'err');
    }
  } finally {
    document.getElementById('btnSalvar').disabled = false;
    setLoading(false);
  }
});

// Excluir 
function abrirExcluir(id, nome) {
  excluindoId = id;
  document.getElementById('exNome').textContent = nome;
  document.getElementById('overlayEx').classList.add('on');
  document.getElementById('modalEx').classList.add('on');
}

function fecharExcluir() {
  excluindoId = null;
  document.getElementById('overlayEx').classList.remove('on');
  document.getElementById('modalEx').classList.remove('on');
}

document.getElementById('btnCancelarEx').addEventListener('click', fecharExcluir);
document.getElementById('overlayEx').addEventListener('click', fecharExcluir);

document.getElementById('btnConfEx').addEventListener('click', async () => {
  if (!excluindoId) return;
  setLoading(true);
  try {
    await UsuarioAPI.excluir(excluindoId);
    toast('Usuário excluído com sucesso!');
    fecharExcluir();
    await carregarUsuarios();
  } catch (_) {
    toast('Erro ao excluir usuário.', 'err');
  } finally {
    setLoading(false);
  }
});

// Init
(async () => {
  await carregarPerfis();
  await carregarUsuarios();
})();

const LABELS_PERMISSAO = {
  'ADMIN':     'Administrador',
  'GERENTE':   'Gerente',
  'ESTOQUE':   'Estoquista',
  'CONSULTOR': 'Consultor'
};

const CORES_PERMISSAO = {
  'ADMIN':     { bg: '#e8effe', cor: '#1e4db7' },
  'GERENTE':   { bg: '#f3e8fe', cor: '#6b21a8' },
  'ESTOQUE':   { bg: '#e8f8ef', cor: '#1b6b31' },
  'CONSULTOR': { bg: '#fef3e2', cor: '#946a00' }
};

let editandoPerfilId = null;
let excluindoPerfilId = null;

// Abre / fecha modal de perfis 
document.getElementById('btnGerenciarPerfis').addEventListener('click', async () => {
  document.getElementById('overlayPerfis').classList.add('on');
  document.getElementById('modalPerfis').classList.add('on');
  await renderTabelaPerfis();
});

function fecharModalPerfis() {
  document.getElementById('overlayPerfis').classList.remove('on');
  document.getElementById('modalPerfis').classList.remove('on');
  limparFormPerfil();
  // recarrega checkboxes de perfis no modal de usuário
  carregarPerfis();
}

document.getElementById('btnFecharPerfis').addEventListener('click', fecharModalPerfis);
document.getElementById('overlayPerfis').addEventListener('click', fecharModalPerfis);

// Renderiza tabela de perfis no modal 
async function renderTabelaPerfis() {
  const tbody = document.getElementById('tbodyPerfis');
  tbody.innerHTML = `<tr><td colspan="5" class="td-vazio">Carregando...</td></tr>`;
  try {
    const lista = await PerfilAPI.listar();
    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="td-vazio">Nenhum perfil cadastrado.</td></tr>`;
      return;
    }
    tbody.innerHTML = lista.map(p => {
      const c = CORES_PERMISSAO[p.permissao] || { bg: '#edf0f5', cor: '#4a5568' };
      const label = LABELS_PERMISSAO[p.permissao] || p.permissao;
      return `
        <tr>
          <td class="td-id">${p.idPerfil}</td>
          <td class="td-nome">${escHtml(p.nome)}</td>
          <td>
            <span class="sku-tag" style="background:${c.bg};color:${c.cor}">
              ${escHtml(label)}
            </span>
          </td>
          <td class="td-un">${p.totalUsuarios ?? '—'}</td>
          <td class="td-acoes">
            <div class="acoes-grupo">
              <button class="btn-acao btn-editar" title="Editar"
                onclick="editarPerfil(${p.idPerfil})">
                <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="btn-acao btn-excluir" title="Excluir"
                onclick="confirmarExcluirPerfil(${p.idPerfil}, '${escHtml(p.nome)}')">
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
    }).join('');
  } catch (_) {
    tbody.innerHTML = `<tr><td colspan="5" class="td-vazio">Erro ao carregar perfis.</td></tr>`;
  }
}

// Formulário inline de perfil 
function limparFormPerfil() {
  editandoPerfilId = null;
  document.getElementById('pNome').value = '';
  document.getElementById('pPermissao').value = '';
  document.getElementById('pErroNome').textContent = '';
  document.getElementById('pErroPermissao').textContent = '';
  document.getElementById('pNome').classList.remove('erro');
  document.getElementById('pPermissao').classList.remove('erro');
  document.getElementById('tituloFormPerfil').textContent = 'Novo Perfil';
  document.getElementById('pBtnCancelar').style.display = 'none';
  document.getElementById('pBtnSalvar').textContent = 'Salvar';
}

async function editarPerfil(id) {
  try {
    const p = await PerfilAPI.porId(id);
    editandoPerfilId = id;
    document.getElementById('pNome').value      = p.nome      || '';
    document.getElementById('pPermissao').value = p.permissao || '';
    document.getElementById('tituloFormPerfil').textContent = 'Editar Perfil';
    document.getElementById('pBtnCancelar').style.display = '';
    document.getElementById('pBtnSalvar').textContent = 'Atualizar';
    document.getElementById('pNome').focus();
  } catch (_) {
    toast('Erro ao carregar perfil.', 'err');
  }
}

document.getElementById('pBtnCancelar').addEventListener('click', limparFormPerfil);

document.getElementById('pBtnSalvar').addEventListener('click', async () => {
  const nome      = document.getElementById('pNome').value.trim();
  const permissao = document.getElementById('pPermissao').value;
  let ok = true;

  if (!nome) {
    document.getElementById('pErroNome').textContent = 'Nome é obrigatório.';
    document.getElementById('pNome').classList.add('erro');
    ok = false;
  } else {
    document.getElementById('pErroNome').textContent = '';
    document.getElementById('pNome').classList.remove('erro');
  }

  if (!permissao) {
    document.getElementById('pErroPermissao').textContent = 'Selecione uma permissão.';
    document.getElementById('pPermissao').classList.add('erro');
    ok = false;
  } else {
    document.getElementById('pErroPermissao').textContent = '';
    document.getElementById('pPermissao').classList.remove('erro');
  }

  if (!ok) return;

  document.getElementById('pBtnSalvar').disabled = true;
  try {
    if (editandoPerfilId) {
      await PerfilAPI.atualizar(editandoPerfilId, { nome, permissao });
      toast('Perfil atualizado com sucesso!');
    } else {
      await PerfilAPI.criar({ nome, permissao });
      toast('Perfil cadastrado com sucesso!');
    }
    limparFormPerfil();
    await renderTabelaPerfis();
    await carregarPerfis(); // atualiza checkboxes
  } catch (err) {
    const msg = err.message || '';
    if (msg.toLowerCase().includes('nome')) {
      document.getElementById('pErroNome').textContent = 'Já existe um perfil com este nome.';
      document.getElementById('pNome').classList.add('erro');
    } else {
      toast('Erro ao salvar perfil.', 'err');
    }
  } finally {
    document.getElementById('pBtnSalvar').disabled = false;
  }
});

// Excluir perfil 
function confirmarExcluirPerfil(id, nome) {
  excluindoPerfilId = id;
  document.getElementById('exNomePerfil').textContent = nome;
  document.getElementById('overlayExPerfil').classList.add('on');
  document.getElementById('modalExPerfil').classList.add('on');
}

function fecharExcluirPerfil() {
  excluindoPerfilId = null;
  document.getElementById('overlayExPerfil').classList.remove('on');
  document.getElementById('modalExPerfil').classList.remove('on');
}

document.getElementById('pBtnCancelarEx').addEventListener('click', fecharExcluirPerfil);
document.getElementById('overlayExPerfil').addEventListener('click', fecharExcluirPerfil);

document.getElementById('pBtnConfEx').addEventListener('click', async () => {
  if (!excluindoPerfilId) return;
  setLoading(true);
  try {
    await PerfilAPI.excluir(excluindoPerfilId);
    toast('Perfil excluído com sucesso!');
    fecharExcluirPerfil();
    await renderTabelaPerfis();
    await carregarPerfis();
  } catch (err) {
    const msg = err.message || '';
    if (msg.toLowerCase().includes('vinculado') || msg.toLowerCase().includes('usu')) {
      toast('Não é possível excluir: perfil possui usuários vinculados.', 'err');
    } else {
      toast('Erro ao excluir perfil.', 'err');
    }
    fecharExcluirPerfil();
  } finally {
    setLoading(false);
  }
});