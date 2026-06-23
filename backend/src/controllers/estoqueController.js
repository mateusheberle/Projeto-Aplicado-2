const db = require('../config/database');

exports.listar = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        ep.idEstoque_Produto,
        e.idEstoque,
        e.nome           AS nomeEstoque,
        l.idLocalizacao,
        l.nome           AS nomeLocalizacao,
        l.setor          AS setorLocalizacao,
        p.idProduto      AS produto_id,
        p.nome           AS nomeProduto,
        p.sku,
        ep.quantidade,
        ep.quantidade_min
      FROM Estoque e
      INNER JOIN Localizacao    l  ON l.idLocalizacao = e.localizacao_id
      LEFT  JOIN Estoque_Produto ep ON ep.estoque_id  = e.idEstoque
      LEFT  JOIN Produto         p  ON p.idProduto    = ep.produto_id
      ORDER BY l.setor, l.nome, e.nome, p.nome
    `);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar estoque:', err);
    res.status(500).json({ erro: 'Erro interno ao listar estoque.' });
  }
};

exports.listarEstoques = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        e.idEstoque,
        e.nome        AS nomeEstoque,
        l.idLocalizacao,
        l.nome        AS nomeLocalizacao,
        l.setor       AS setorLocalizacao
      FROM Estoque e
      INNER JOIN Localizacao l ON l.idLocalizacao = e.localizacao_id
      ORDER BY l.setor, e.nome
    `);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar estoques:', err);
    res.status(500).json({ erro: 'Erro interno ao listar estoques.' });
  }
};

exports.buscarEstoquePorId = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(`
      SELECT e.idEstoque, e.nome AS nomeEstoque, l.idLocalizacao,
             l.nome AS nomeLocalizacao, l.setor AS setorLocalizacao
      FROM Estoque e
      INNER JOIN Localizacao l ON l.idLocalizacao = e.localizacao_id
      WHERE e.idEstoque = ?
    `, [id]);
    if (!rows.length) return res.status(404).json({ erro: 'Estoque não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno.' });
  }
};

exports.buscarPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(`
      SELECT
        ep.idEstoque_Produto,
        e.idEstoque,
        e.nome        AS nomeEstoque,
        l.idLocalizacao,
        l.nome        AS nomeLocalizacao,
        l.setor       AS setorLocalizacao,
        p.idProduto   AS produto_id,
        p.nome        AS nomeProduto,
        ep.quantidade,
        ep.quantidade_min
      FROM Estoque_Produto ep
      INNER JOIN Estoque     e ON e.idEstoque     = ep.estoque_id
      INNER JOIN Localizacao l ON l.idLocalizacao = e.localizacao_id
      INNER JOIN Produto     p ON p.idProduto     = ep.produto_id
      WHERE ep.idEstoque_Produto = ?
    `, [id]);
    if (!rows.length) return res.status(404).json({ erro: 'Item não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno.' });
  }
};

exports.criar = async (req, res) => {
  const { nome, localizacao_id } = req.body;
  if (!nome || !localizacao_id)
    return res.status(400).json({ erro: 'Nome e localização são obrigatórios.' });

  try {
    const [dup] = await db.query(
      'SELECT idEstoque FROM Estoque WHERE nome = ? AND localizacao_id = ?',
      [nome, localizacao_id]
    );
    if (dup.length)
      return res.status(409).json({ erro: 'Já existe um estoque com este nome nesta localização.' });

    const [result] = await db.query(
      'INSERT INTO Estoque (nome, localizacao_id) VALUES (?, ?)', [nome, localizacao_id]
    );
    res.status(201).json({ idEstoque: result.insertId, mensagem: 'Estoque criado com sucesso.' });
  } catch (err) {
    console.error('Erro ao criar estoque:', err);
    res.status(500).json({ erro: 'Erro interno ao criar estoque.' });
  }
};

exports.atualizar = async (req, res) => {
  const { id } = req.params;
  const { nome, localizacao_id } = req.body;
  if (!nome || !localizacao_id)
    return res.status(400).json({ erro: 'Nome e localização são obrigatórios.' });

  try {
    const [existe] = await db.query(
      'SELECT idEstoque FROM Estoque WHERE idEstoque = ?', [id]
    );
    if (!existe.length) return res.status(404).json({ erro: 'Estoque não encontrado.' });

    const [dup] = await db.query(
      'SELECT idEstoque FROM Estoque WHERE nome = ? AND localizacao_id = ? AND idEstoque <> ?',
      [nome, localizacao_id, id]
    );
    if (dup.length)
      return res.status(409).json({ erro: 'Já existe um estoque com este nome nesta localização.' });

    await db.query(
      'UPDATE Estoque SET nome = ?, localizacao_id = ? WHERE idEstoque = ?',
      [nome, localizacao_id, id]
    );
    res.json({ mensagem: 'Estoque atualizado com sucesso.' });
  } catch (err) {
    console.error('Erro ao atualizar estoque:', err);
    res.status(500).json({ erro: 'Erro interno ao atualizar estoque.' });
  }
};

exports.excluir = async (req, res) => {
  const { id } = req.params;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [existe] = await conn.query(
      'SELECT idEstoque FROM Estoque WHERE idEstoque = ?', [id]
    );
    if (!existe.length) {
      await conn.rollback();
      return res.status(404).json({ erro: 'Estoque não encontrado.' });
    }

    const [itens] = await conn.query(
      'SELECT idEstoque_Produto FROM Estoque_Produto WHERE estoque_id = ?', [id]
    );
    if (itens.length) {
      await conn.rollback();
      return res.status(409).json({ erro: 'Não é possível excluir: estoque possui produtos vinculados.' });
    }

    await conn.query(
      'UPDATE Movimentacao SET estoque_origem_id = NULL WHERE estoque_origem_id = ?',
      [id]
    );
    await conn.query(
      'UPDATE Movimentacao SET estoque_destino_id = NULL WHERE estoque_destino_id = ?',
      [id]
    );

    await conn.query('DELETE FROM Estoque WHERE idEstoque = ?', [id]);
    await conn.commit();
    res.json({ mensagem: 'Estoque excluído com sucesso.' });
  } catch (err) {
    await conn.rollback();

    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        erro: 'Não é possível excluir: existem registros relacionados a este estoque.'
      });
    }

    console.error('Erro ao excluir estoque:', err);
    res.status(500).json({ erro: 'Erro interno ao excluir estoque.' });
  } finally {
    conn.release();
  }
};

exports.atualizarItem = async (req, res) => {
  const { id } = req.params;
  const { quantidade_min } = req.body;

  try {
    const [existe] = await db.query(
      'SELECT idEstoque_Produto FROM Estoque_Produto WHERE idEstoque_Produto = ?', [id]
    );
    if (!existe.length) return res.status(404).json({ erro: 'Item não encontrado.' });

    await db.query(
      'UPDATE Estoque_Produto SET quantidade_min = ? WHERE idEstoque_Produto = ?',
      [quantidade_min ?? 0, id]
    );
    res.json({ mensagem: 'Item atualizado com sucesso.' });
  } catch (err) {
    console.error('Erro ao atualizar item:', err);
    res.status(500).json({ erro: 'Erro interno ao atualizar item.' });
  }
};

exports.excluirItem = async (req, res) => {
  const { id } = req.params;
  try {
    const [existe] = await db.query(
      'SELECT idEstoque_Produto FROM Estoque_Produto WHERE idEstoque_Produto = ?', [id]
    );
    if (!existe.length) return res.status(404).json({ erro: 'Item não encontrado.' });

    await db.query('DELETE FROM Estoque_Produto WHERE idEstoque_Produto = ?', [id]);
    res.json({ mensagem: 'Produto removido do estoque.' });
  } catch (err) {
    console.error('Erro ao excluir item:', err);
    res.status(500).json({ erro: 'Erro interno ao excluir item.' });
  }
};