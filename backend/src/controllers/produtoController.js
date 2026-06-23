const db = require('../config/database');

const listarProdutos = async (req, res) => {
  try {
    const { busca, categoria, pagina = 1, limite = 50 } = req.query;
    const offset = (pagina - 1) * limite;

    let where = 'WHERE 1=1';
    const params = [];

    if (busca) {
      where += ' AND (nome LIKE ? OR sku LIKE ? OR descricao LIKE ?)';
      params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
    }
    if (categoria) {
      where += ' AND categoria = ?';
      params.push(categoria);
    }

    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM Produto ${where}`, params);
    const [dados]       = await db.query(
      `SELECT * FROM Produto ${where} ORDER BY nome ASC LIMIT ? OFFSET ?`,
      [...params, Number(limite), Number(offset)]
    );

    res.json({ dados, total, pagina: Number(pagina), totalPaginas: Math.ceil(total / limite) });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar produtos', detalhe: err.message });
  }
};

const buscarProduto = async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT * FROM Produto WHERE idProduto = ?', [req.params.id]);
    if (!row) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

const criarProduto = async (req, res) => {
  try {
    const { sku, nome, descricao, preco, categoria, marca, unidadeMedida, estoque } = req.body;

    if (!sku || !nome || preco == null) {
      return res.status(400).json({ erro: 'SKU, nome e preço são obrigatórios' });
    }

    const [[dup]] = await db.query('SELECT idProduto FROM Produto WHERE sku = ?', [sku]);
    if (dup) return res.status(409).json({ erro: 'SKU já cadastrado' });

    const [result] = await db.query(
      'INSERT INTO Produto (sku, nome, descricao, preco, categoria, marca, unidadeMedida, estoque) VALUES (?,?,?,?,?,?,?,?)',
      [sku, nome, descricao || null, preco, categoria || null, marca || null, unidadeMedida || null, Number(estoque) || 0]
    );

    res.status(201).json({ mensagem: 'Produto criado', id: result.insertId });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

const atualizarProduto = async (req, res) => {
  try {
    const { sku, nome, descricao, preco, categoria, marca, unidadeMedida, estoque } = req.body;
    const { id } = req.params;

    const [[exist]] = await db.query('SELECT idProduto FROM Produto WHERE idProduto = ?', [id]);
    if (!exist) return res.status(404).json({ erro: 'Produto não encontrado' });

    const [[dup]] = await db.query('SELECT idProduto FROM Produto WHERE sku = ? AND idProduto != ?', [sku, id]);
    if (dup) return res.status(409).json({ erro: 'SKU já utilizado por outro produto' });

    await db.query(
      'UPDATE Produto SET sku=?, nome=?, descricao=?, preco=?, categoria=?, marca=?, unidadeMedida=?, estoque=? WHERE idProduto=?',
      [sku, nome, descricao || null, preco, categoria || null, marca || null, unidadeMedida || null, Number(estoque) || 0, id]
    );

    res.json({ mensagem: 'Produto atualizado' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

const excluirProduto = async (req, res) => {
  const conn = await db.getConnection();
  
  try {
    const produtoId = Number(req.params.id);

    const [[exist]] = await conn.query('SELECT idProduto FROM Produto WHERE idProduto = ?', [produtoId]);
    if (!exist) return res.status(404).json({ erro: 'Produto não encontrado' });

    const [[dependencias]] = await conn.query(`
      SELECT
        (SELECT COUNT(*) FROM Estoque_Produto WHERE produto_id = ?) AS totalEstoque
    `, [produtoId]);

    if (dependencias.totalEstoque > 0) {
      return res.status(409).json({
        erro: 'Não é possível excluir o produto porque ele ainda está vinculado a itens de estoque.'
      });
    }

    await conn.beginTransaction();

    await conn.query('DELETE FROM Produto WHERE idProduto = ?', [produtoId]);
    await conn.commit();

    res.json({ mensagem: 'Produto excluído com sucesso.' });
  } catch (err) {
    await conn.rollback();

    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        erro: 'Não é possível excluir o produto porque existem registros relacionados a ele.'
      });
    }

    res.status(500).json({ erro: err.message });
  } finally {
    conn.release();
  }
};

module.exports = { listarProdutos, buscarProduto, criarProduto, atualizarProduto, excluirProduto };