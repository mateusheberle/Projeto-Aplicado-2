const { test, expect } = require('@playwright/test');

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:3001';
const LOGIN = {
  usuario: process.env.E2E_LOGIN || 'admin@negrao.com.br',
  senha: process.env.E2E_SENHA || 'admin123',
};

function uniqueId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

async function apiLogin(request) {
  const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
    data: { login: LOGIN.usuario, senha: LOGIN.senha },
  });
  expect(loginRes.ok()).toBeTruthy();
  return loginRes.json();
}

async function realizarLogin(page) {
  await page.goto('/login.html');
  await page.fill('#iLogin', LOGIN.usuario);
  await page.fill('#iSenha', LOGIN.senha);
  await page.click('#btnLogin');
  await expect(page).toHaveURL(/dashboard\.html$/);
}

test.describe('API - smoke', () => {
  test('healthcheck responde OK', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/health`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('login e dashboard possuem dados', async ({ request }) => {
    const loginBody = await apiLogin(request);
    expect(loginBody).toHaveProperty('token');
    expect(loginBody).toHaveProperty('usuario.nome');

    const dashRes = await request.get(`${API_BASE}/api/dashboard`);
    expect(dashRes.ok()).toBeTruthy();
    const dashBody = await dashRes.json();

    expect(dashBody).toHaveProperty('cards');
    expect(typeof dashBody.cards.totalProdutos).toBe('number');
  });

  test('CRUD de produto via API', async ({ request }) => {
    const sku = uniqueId('E2E-SKU');
    const nomeAtualizado = uniqueId('Produto API Atualizado');

    const criarRes = await request.post(`${API_BASE}/api/produtos`, {
      data: {
        sku,
        nome: uniqueId('Produto API'),
        descricao: 'Criado por teste E2E',
        preco: 17.9,
        categoria: 'Outros',
        marca: 'Playwright',
        unidadeMedida: 'un',
        estoque: 0,
      },
    });
    expect(criarRes.status()).toBe(201);

    const criarBody = await criarRes.json();
    const idProduto = criarBody.id;
    expect(idProduto).toBeTruthy();

    const buscarRes = await request.get(`${API_BASE}/api/produtos/${idProduto}`);
    expect(buscarRes.ok()).toBeTruthy();
    const buscarBody = await buscarRes.json();
    expect(buscarBody.sku).toBe(sku);

    const atualizarRes = await request.put(`${API_BASE}/api/produtos/${idProduto}`, {
      data: {
        sku,
        nome: nomeAtualizado,
        descricao: 'Atualizado por teste E2E',
        preco: 27.5,
        categoria: 'Outros',
        marca: 'Playwright',
        unidadeMedida: 'un',
        estoque: 0,
      },
    });
    expect(atualizarRes.ok()).toBeTruthy();

    const validacaoRes = await request.get(`${API_BASE}/api/produtos?busca=${encodeURIComponent(nomeAtualizado)}`);
    expect(validacaoRes.ok()).toBeTruthy();
    const validacaoBody = await validacaoRes.json();
    expect(validacaoBody.dados.some((p) => p.idProduto === idProduto)).toBeTruthy();

    const excluirRes = await request.delete(`${API_BASE}/api/produtos/${idProduto}`);
    expect(excluirRes.ok()).toBeTruthy();
  });

  test('CRUD de usuário via API', async ({ request }) => {
    const nome = uniqueId('Usuario API');
    const email = `${uniqueId('usuario').toLowerCase()}@e2e.test`;
    const nomeAtualizado = uniqueId('Usuario API Editado');

    const criarRes = await request.post(`${API_BASE}/api/usuarios`, {
      data: {
        nome,
        email,
        senha: 'e2e12345',
        perfis: [],
      },
    });
    expect(criarRes.status()).toBe(201);
    const criarBody = await criarRes.json();
    const idUsuario = criarBody.idUsuario;
    expect(idUsuario).toBeTruthy();

    const buscarRes = await request.get(`${API_BASE}/api/usuarios/${idUsuario}`);
    expect(buscarRes.ok()).toBeTruthy();

    const atualizarRes = await request.put(`${API_BASE}/api/usuarios/${idUsuario}`, {
      data: {
        nome: nomeAtualizado,
        email,
        perfis: [],
      },
    });
    expect(atualizarRes.ok()).toBeTruthy();

    const listaRes = await request.get(`${API_BASE}/api/usuarios`);
    expect(listaRes.ok()).toBeTruthy();
    const lista = await listaRes.json();
    expect(lista.some((u) => u.idUsuario === idUsuario && u.nome === nomeAtualizado)).toBeTruthy();

    const excluirRes = await request.delete(`${API_BASE}/api/usuarios/${idUsuario}`);
    expect(excluirRes.ok()).toBeTruthy();
  });

  test('CRUD de localização e estoque via API', async ({ request }) => {
    const locNome = uniqueId('Loc API');
    const locSetor = uniqueId('Setor API');
    const estNome = uniqueId('Est API');
    const estNomeAtualizado = uniqueId('Est API Editado');

    const locRes = await request.post(`${API_BASE}/api/localizacao`, {
      data: { nome: locNome, setor: locSetor },
    });
    expect(locRes.status()).toBe(201);
    const { idLocalizacao } = await locRes.json();

    const criarEstRes = await request.post(`${API_BASE}/api/estoque`, {
      data: { nome: estNome, localizacao_id: idLocalizacao },
    });
    expect(criarEstRes.status()).toBe(201);
    const criarEstBody = await criarEstRes.json();
    const idEstoque = criarEstBody.idEstoque;

    const atualizarEstRes = await request.put(`${API_BASE}/api/estoque/${idEstoque}`, {
      data: { nome: estNomeAtualizado, localizacao_id: idLocalizacao },
    });
    expect(atualizarEstRes.ok()).toBeTruthy();

    const listarEstRes = await request.get(`${API_BASE}/api/estoque/estoques`);
    expect(listarEstRes.ok()).toBeTruthy();
    const estoques = await listarEstRes.json();
    expect(estoques.some((e) => e.idEstoque === idEstoque && e.nomeEstoque === estNomeAtualizado)).toBeTruthy();

    const excluirEstRes = await request.delete(`${API_BASE}/api/estoque/${idEstoque}`);
    expect(excluirEstRes.ok()).toBeTruthy();

    const excluirLocRes = await request.delete(`${API_BASE}/api/localizacao/${idLocalizacao}`);
    expect(excluirLocRes.ok()).toBeTruthy();
  });

  test('fluxo de movimentação via API (entrada, saída e transferência)', async ({ request }) => {
    const loginBody = await apiLogin(request);
    const usuarioId = loginBody.usuario.idUsuario;

    const sku = uniqueId('E2E-MOV-SKU');
    const nomeProduto = uniqueId('Produto Mov API');

    const criarProdutoRes = await request.post(`${API_BASE}/api/produtos`, {
      data: {
        sku,
        nome: nomeProduto,
        descricao: 'Produto para movimentação E2E',
        preco: 9.9,
        categoria: 'Outros',
        marca: 'Playwright',
        unidadeMedida: 'un',
        estoque: 0,
      },
    });
    expect(criarProdutoRes.status()).toBe(201);
    const { id: idProduto } = await criarProdutoRes.json();

    let localizacaoTempId = null;
    let estoqueTempId = null;

    try {
      const estRes = await request.get(`${API_BASE}/api/estoque/estoques`);
      expect(estRes.ok()).toBeTruthy();
      let estoques = await estRes.json();

      if (estoques.length < 2) {
        const locRes = await request.post(`${API_BASE}/api/localizacao`, {
          data: {
            nome: uniqueId('Loc Mov'),
            setor: uniqueId('Setor Mov'),
          },
        });
        expect(locRes.status()).toBe(201);
        localizacaoTempId = (await locRes.json()).idLocalizacao;

        const criarEstRes = await request.post(`${API_BASE}/api/estoque`, {
          data: {
            nome: uniqueId('Est Mov'),
            localizacao_id: localizacaoTempId,
          },
        });
        expect(criarEstRes.status()).toBe(201);
        estoqueTempId = (await criarEstRes.json()).idEstoque;

        const estRes2 = await request.get(`${API_BASE}/api/estoque/estoques`);
        expect(estRes2.ok()).toBeTruthy();
        estoques = await estRes2.json();
      }

      expect(estoques.length).toBeGreaterThan(1);
      const estoqueOrigemId = estoques[0].idEstoque;
      const estoqueDestinoId = estoques.find((e) => e.idEstoque !== estoqueOrigemId).idEstoque;

      const entradaRes = await request.post(`${API_BASE}/api/movimentacao/entrada`, {
        data: {
          produto_id: idProduto,
          estoque_id: estoqueOrigemId,
          quantidade: 7,
          quantidade_min: 1,
          usuario_id: usuarioId,
          observacao: 'Entrada E2E',
        },
      });
      expect(entradaRes.ok()).toBeTruthy();

      const saidaRes = await request.post(`${API_BASE}/api/movimentacao/saida`, {
        data: {
          produto_id: idProduto,
          estoque_id: estoqueOrigemId,
          quantidade: 2,
          usuario_id: usuarioId,
          observacao: 'Saída E2E',
        },
      });
      expect(saidaRes.ok()).toBeTruthy();

      const transfRes = await request.post(`${API_BASE}/api/movimentacao/transferencia`, {
        data: {
          produto_id: idProduto,
          estoque_origem_id: estoqueOrigemId,
          estoque_destino_id: estoqueDestinoId,
          quantidade: 3,
          usuario_id: usuarioId,
          observacao: 'Transferência E2E',
        },
      });
      expect(transfRes.ok()).toBeTruthy();

      const listaMovRes = await request.get(`${API_BASE}/api/movimentacao?produto_id=${idProduto}`);
      expect(listaMovRes.ok()).toBeTruthy();
      const movs = await listaMovRes.json();

      const tipos = new Set(movs.map((m) => m.tipo));
      expect(tipos.has(1)).toBeTruthy();
      expect(tipos.has(2)).toBeTruthy();
      expect(tipos.has(3)).toBeTruthy();
    } finally {
      const estoqueRes = await request.get(`${API_BASE}/api/estoque`);
      if (estoqueRes.ok()) {
        const itens = await estoqueRes.json();
        const itensDoProduto = itens.filter((i) => i.produto_id === idProduto && i.idEstoque_Produto);
        for (const item of itensDoProduto) {
          await request.delete(`${API_BASE}/api/estoque/item/${item.idEstoque_Produto}`);
        }
      }

      await request.delete(`${API_BASE}/api/produtos/${idProduto}`);

      if (estoqueTempId) await request.delete(`${API_BASE}/api/estoque/${estoqueTempId}`);
      if (localizacaoTempId) await request.delete(`${API_BASE}/api/localizacao/${localizacaoTempId}`);
    }
  });
});

test.describe('Interface - fluxos principais', () => {
  test('dashboard exige sessão ativa', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/dashboard.html');
    await expect(page).toHaveURL(/login\.html$/);
  });

  test('login abre dashboard com métricas', async ({ page }) => {
    await realizarLogin(page);

    await expect(page.locator('h1')).toHaveText('Dashboard');
    await expect(page.locator('#activeUserName')).toContainText('Administrador');
    await expect(page.locator('#cardTotalProdutos')).toContainText(/\d+|—/);
    await expect(page.locator('#rodapeInfo')).toContainText(/produto/);
  });

  test('navegação principal entre páginas', async ({ page }) => {
    await realizarLogin(page);

    await page.click('a[href="index.html"]');
    await expect(page).toHaveURL(/index\.html$/);
    await expect(page.locator('h1')).toHaveText('Produtos');

    await page.click('a[href="estoque.html"]');
    await expect(page).toHaveURL(/estoque\.html$/);
    await expect(page.locator('h1')).toHaveText('Estoque');

    await page.click('a[href="relatorios.html"]');
    await expect(page).toHaveURL(/relatorios\.html$/);
    await expect(page.locator('h1')).toHaveText('Relatórios');

    await page.click('a[href="dashboard.html"]');
    await expect(page).toHaveURL(/dashboard\.html$/);
  });

  test('logout retorna para tela de login', async ({ page }) => {
    await realizarLogin(page);

    await page.click('#btnSair');
    await expect(page).toHaveURL(/login\.html$/);
    await expect(page.locator('h2')).toHaveText('Ferragens Negrão');
  });

  test('CRUD de produtos pela interface', async ({ page }) => {
    const sku = uniqueId('E2E-UI-SKU');
    const nome = uniqueId('Produto UI');
    const nomeEditado = `${nome} Editado`;

    await realizarLogin(page);
    await page.goto('/index.html');

    await page.click('#btnNovo');
    await page.fill('#iSku', sku);
    await page.fill('#iNome', nome);
    await page.fill('#iDescricao', 'Produto criado no teste de interface');
    await page.fill('#iPreco', '21.5');
    await page.selectOption('#iCategoria', { label: 'Outros' });
    await page.fill('#iMarca', 'Playwright');
    await page.selectOption('#iUnidade', 'un');
    await page.fill('#iEstoque', '0');
    await page.click('#btnSalvar');

    await expect(page.locator('#toasts')).toContainText(/cadastrado com sucesso/i);

    await page.fill('#iBusca', sku);
    const linha = page.locator('#tbody tr', { hasText: sku }).first();
    await expect(linha).toBeVisible();

    await linha.locator('.btn-editar').click();
    await page.fill('#iNome', nomeEditado);
    await page.fill('#iPreco', '25.9');
    await page.click('#btnSalvar');

    await expect(page.locator('#toasts')).toContainText(/atualizado com sucesso/i);
    await page.fill('#iBusca', nomeEditado);
    await expect(page.locator('#tbody tr', { hasText: nomeEditado }).first()).toBeVisible();

    const linhaEditada = page.locator('#tbody tr', { hasText: sku }).first();
    await linhaEditada.locator('.btn-excluir').click();
    await page.click('#btnConfEx');
    await expect(page.locator('#toasts')).toContainText(/excluído/i);

    await page.fill('#iBusca', sku);
    await expect(page.locator('#tbody tr', { hasText: sku })).toHaveCount(0);
  });

  test('CRUD de usuários pela interface', async ({ page }) => {
    const nome = uniqueId('Usuario UI');
    const email = `${uniqueId('usuario_ui').toLowerCase()}@e2e.test`;
    const nomeEditado = `${nome} Editado`;

    await realizarLogin(page);
    await page.goto('/usuarios.html');

    await page.click('#btnNovo');
    await page.fill('#iNome', nome);
    await page.fill('#iEmail', email);
    await page.fill('#iSenha', 'e2e12345');
    await page.click('#btnSalvar');

    await expect(page.locator('#toasts')).toContainText(/cadastrado com sucesso/i);

    await page.fill('#iBusca', email);
    const linha = page.locator('#tbody tr', { hasText: email }).first();
    await expect(linha).toBeVisible();

    await linha.locator('.btn-editar').click();
    await page.fill('#iNome', nomeEditado);
    await page.click('#btnSalvar');
    await expect(page.locator('#toasts')).toContainText(/atualizado com sucesso/i);

    await page.fill('#iBusca', email);
    const linhaEditada = page.locator('#tbody tr', { hasText: email }).first();
    await expect(linhaEditada).toContainText(nomeEditado);

    await linhaEditada.locator('.btn-excluir').click();
    await page.click('#btnConfEx');
    await expect(page.locator('#toasts')).toContainText(/excluído com sucesso/i);

    await page.fill('#iBusca', email);
    await expect(page.locator('#tbody tr', { hasText: email })).toHaveCount(0);
  });
});
