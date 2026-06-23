const API = (() => {
  const { protocol, hostname, port, origin } = window.location;

  if (protocol === 'file:') return 'http://localhost:3001/api';

  // Quando aberto por Live Server (porta diferente), força backend local.
  if ((hostname === 'localhost' || hostname === '127.0.0.1') && port && port !== '3001') {
    return 'http://localhost:3001/api';
  }

  return origin + '/api';
})();

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(API + path, opts);
  const contentType = r.headers.get('content-type') || '';
  const text = await r.text();
  let d = null;

  if (text && (contentType.includes('application/json') || text.trim().startsWith('{'))) {
    try {
      d = JSON.parse(text);
    } catch (err) {
      throw new Error('Resposta do servidor não é JSON válido');
    }
  }

  if (!r.ok) {
    if (!d && text && text.toLowerCase().includes('<html')) {
      throw new Error('API não encontrada neste endereço. Inicie o backend em http://localhost:3001');
    }
    throw new Error(d?.erro || `Erro na requisição (${r.status})`);
  }

  return d || {};
}

const ProdutoAPI = {
  listar:    (p = {}) => req('GET', '/produtos?' + new URLSearchParams(p)),
  porId:     (id)     => req('GET', `/produtos/${id}`),
  criar:     (b)      => req('POST', '/produtos', b),
  atualizar: (id, b)  => req('PUT', `/produtos/${id}`, b),
  excluir:   (id)     => req('DELETE', `/produtos/${id}`),
};

const DashboardAPI = {
  obterDados: () => req('GET', '/dashboard'),
};

const AuthAPI = {
  login: (loginInput, senha) => req('POST', '/auth/login', { login: loginInput, senha }),
};

const PerfilAPI = {
  listar:    ()       => req('GET',    '/perfis'),
  porId:     (id)     => req('GET',    `/perfis/${id}`),
  criar:     (b)      => req('POST',   '/perfis', b),
  atualizar: (id, b)  => req('PUT',    `/perfis/${id}`, b),
  excluir:   (id)     => req('DELETE', `/perfis/${id}`),
};

const UsuarioAPI = {
  listar:    ()       => req('GET',    '/usuarios'),
  porId:     (id)     => req('GET',    `/usuarios/${id}`),
  criar:     (b)      => req('POST',   '/usuarios', b),
  atualizar: (id, b)  => req('PUT',    `/usuarios/${id}`, b),
  excluir:   (id)     => req('DELETE', `/usuarios/${id}`),
};

const EstoqueAPI = {
  listar:             ()       => req('GET',    '/estoque'),
  listarEstoques:     ()       => req('GET',    '/estoque/estoques'),
  porId:              (id)     => req('GET',    `/estoque/${id}`),
  buscarEstoquePorId: (id)     => req('GET',    `/estoque/estoque/${id}`),
  criar:              (b)      => req('POST',   '/estoque', b),
  atualizar:          (id, b)  => req('PUT',    `/estoque/${id}`, b),
  atualizarItem:      (id, b)  => req('PUT',    `/estoque/item/${id}`, b),
  excluir:            (id)     => req('DELETE', `/estoque/${id}`),
  excluirItem:        (id)     => req('DELETE', `/estoque/item/${id}`),
};

const LocalizacaoAPI = {
  listar:    ()       => req('GET',    '/localizacao'),
  porId:     (id)     => req('GET',    `/localizacao/${id}`),
  criar:     (b)      => req('POST',   '/localizacao', b),
  atualizar: (id, b)  => req('PUT',    `/localizacao/${id}`, b),
  excluir:   (id)     => req('DELETE', `/localizacao/${id}`),
};

const MovimentacaoAPI = {
  listar:        (params) => req('GET',  '/movimentacao?' + new URLSearchParams(params || {})),
  entrada:       (b)      => req('POST', '/movimentacao/entrada', b),
  saida:         (b)      => req('POST', '/movimentacao/saida',   b),
  transferencia: (b)      => req('POST', '/movimentacao/transferencia', b),
};