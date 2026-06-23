// controllers/movimentacaoController.js
const db = require('../config/database');

const TIPO_ENTRADA       = 1;
const TIPO_SAIDA         = 2;
const TIPO_TRANSFERENCIA = 3;

// GET /movimentacao
exports.listar = async (req, res) => {
  try {
    const { tipo, produto_id, estoque_id, dataInicio, dataFim } = req.query;
    let where = [], params = [];

    if (tipo)       { where.push('m.tipo = ?');                                            params.push(tipo); }
    if (produto_id) { where.push('m.produto_id = ?');                                      params.push(produto_id); }
    if (estoque_id) { where.push('(m.estoque_origem_id = ? OR m.estoque_destino_id = ?)'); params.push(estoque_id, estoque_id); }
    if (dataInicio) { where.push('m.data_movimentacao >= ?');                              params.push(dataInicio); }
    if (dataFim)    { where.push('m.data_movimentacao <= ?');                              params.push(dataFim); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [rows] = await db.query(`
      SELECT
        m.idMovimentacao,
        m.tipo,
        CASE m.tipo
          WHEN 1 THEN 'Entrada'
          WHEN 2 THEN 'Saída'
          WHEN 3 THEN 'Transferência'
        END AS tipoNome,
        m.quantidade,
        m.data_movimentacao,
        m.observacao,
        COALESCE(p.nome, 'Produto removido') AS nomeProduto,
        COALESCE(p.sku, '—')                 AS sku,
        u.nome  AS nomeUsuario,
        eo.nome AS nomeEstoqueOrigem,
        ed.nome AS nomeEstoqueDestino
      FROM Movimentacao m
      LEFT  JOIN Produto  p  ON p.idProduto  = m.produto_id
      INNER JOIN Usuario  u  ON u.idUsuario  = m.usuario_id
      LEFT  JOIN Estoque  eo ON eo.idEstoque = m.estoque_origem_id
      LEFT  JOIN Estoque  ed ON ed.idEstoque = m.estoque_destino_id
      ${whereClause}
      ORDER BY m.data_movimentacao DESC, m.idMovimentacao DESC
    `, params);

    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar movimentações:', err);
    res.status(500).json({ erro: 'Erro interno ao listar movimentações.' });
  }
};

// POST /movimentacao/entrada
exports.entrada = async (req, res) => {
  const { produto_id, estoque_id, quantidade, quantidade_min = 0, observacao, usuario_id } = req.body;
  const usuarioId = Number(usuario_id);

  if (!produto_id || !estoque_id || !quantidade || quantidade <= 0 || !usuarioId)
    return res.status(400).json({ erro: 'produto_id, estoque_id, quantidade e usuario_id são obrigatórios.' });

  try {
    const [ep] = await db.query(
      'SELECT idEstoque_Produto, quantidade FROM Estoque_Produto WHERE estoque_id = ? AND produto_id = ?',
      [estoque_id, produto_id]
    );

    let novaQtd;
    if (ep.length) {
      novaQtd = ep[0].quantidade + parseInt(quantidade);
      await db.query(
        'UPDATE Estoque_Produto SET quantidade = ? WHERE idEstoque_Produto = ?',
        [novaQtd, ep[0].idEstoque_Produto]
      );
    } else {
      novaQtd = parseInt(quantidade);
      await db.query(
        'INSERT INTO Estoque_Produto (estoque_id, produto_id, quantidade, quantidade_min) VALUES (?, ?, ?, ?)',
        [estoque_id, produto_id, novaQtd, quantidade_min]
      );
    }

    await db.query(
      'INSERT INTO Movimentacao (produto_id, usuario_id, tipo, quantidade, data_movimentacao, estoque_destino_id, observacao) VALUES (?, ?, ?, ?, NOW(), ?, ?)',
      [produto_id, usuarioId, TIPO_ENTRADA, quantidade, estoque_id, observacao || null]
    );

    res.json({ mensagem: 'Entrada registrada com sucesso.', novaQuantidade: novaQtd });
  } catch (err) {
    console.error('Erro ao registrar entrada:', err);
    res.status(500).json({ erro: 'Erro interno ao registrar entrada.' });
  }
};

// POST /movimentacao/saida
exports.saida = async (req, res) => {
  const { produto_id, estoque_id, quantidade, observacao, usuario_id } = req.body;
  const usuarioId = Number(usuario_id);

  if (!produto_id || !estoque_id || !quantidade || quantidade <= 0 || !usuarioId)
    return res.status(400).json({ erro: 'produto_id, estoque_id, quantidade e usuario_id são obrigatórios.' });

  try {
    const [ep] = await db.query(
      'SELECT idEstoque_Produto, quantidade FROM Estoque_Produto WHERE estoque_id = ? AND produto_id = ?',
      [estoque_id, produto_id]
    );
    if (!ep.length)
      return res.status(404).json({ erro: 'Produto não encontrado neste estoque.' });

    if (ep[0].quantidade < quantidade)
      return res.status(400).json({ erro: `Quantidade insuficiente. Disponível: ${ep[0].quantidade}` });

    const novaQtd = ep[0].quantidade - parseInt(quantidade);
    await db.query(
      'UPDATE Estoque_Produto SET quantidade = ? WHERE idEstoque_Produto = ?',
      [novaQtd, ep[0].idEstoque_Produto]
    );

    await db.query(
      'INSERT INTO Movimentacao (produto_id, usuario_id, tipo, quantidade, data_movimentacao, estoque_origem_id, observacao) VALUES (?, ?, ?, ?, NOW(), ?, ?)',
      [produto_id, usuarioId, TIPO_SAIDA, quantidade, estoque_id, observacao || null]
    );

    res.json({ mensagem: 'Saída registrada com sucesso.', novaQuantidade: novaQtd });
  } catch (err) {
    console.error('Erro ao registrar saída:', err);
    res.status(500).json({ erro: 'Erro interno ao registrar saída.' });
  }
};

// POST /movimentacao/transferencia
exports.transferencia = async (req, res) => {
  const { produto_id, estoque_origem_id, estoque_destino_id, quantidade, observacao, usuario_id } = req.body;
  const usuarioId = Number(usuario_id);

  if (!produto_id || !estoque_origem_id || !estoque_destino_id || !quantidade || quantidade <= 0 || !usuarioId)
    return res.status(400).json({ erro: 'produto_id, estoque_origem_id, estoque_destino_id, quantidade e usuario_id são obrigatórios.' });

  if (parseInt(estoque_origem_id) === parseInt(estoque_destino_id))
    return res.status(400).json({ erro: 'Estoque de origem e destino não podem ser iguais.' });

  try {
    const [epOrigem] = await db.query(
      'SELECT idEstoque_Produto, quantidade FROM Estoque_Produto WHERE estoque_id = ? AND produto_id = ?',
      [estoque_origem_id, produto_id]
    );
    if (!epOrigem.length)
      return res.status(404).json({ erro: 'Produto não encontrado no estoque de origem.' });

    if (epOrigem[0].quantidade < quantidade)
      return res.status(400).json({ erro: `Quantidade insuficiente. Disponível: ${epOrigem[0].quantidade}` });

    const [epDestino] = await db.query(
      'SELECT idEstoque_Produto, quantidade FROM Estoque_Produto WHERE estoque_id = ? AND produto_id = ?',
      [estoque_destino_id, produto_id]
    );

    await db.query(
      'UPDATE Estoque_Produto SET quantidade = ? WHERE idEstoque_Produto = ?',
      [epOrigem[0].quantidade - parseInt(quantidade), epOrigem[0].idEstoque_Produto]
    );

    if (epDestino.length) {
      await db.query(
        'UPDATE Estoque_Produto SET quantidade = ? WHERE idEstoque_Produto = ?',
        [epDestino[0].quantidade + parseInt(quantidade), epDestino[0].idEstoque_Produto]
      );
    } else {
      await db.query(
        'INSERT INTO Estoque_Produto (estoque_id, produto_id, quantidade, quantidade_min) VALUES (?, ?, ?, 0)',
        [estoque_destino_id, produto_id, quantidade]
      );
    }

    await db.query(
      'INSERT INTO Movimentacao (produto_id, usuario_id, tipo, quantidade, data_movimentacao, estoque_origem_id, estoque_destino_id, observacao) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)',
      [produto_id, usuarioId, TIPO_TRANSFERENCIA, quantidade, estoque_origem_id, estoque_destino_id, observacao || null]
    );

    res.json({ mensagem: 'Transferência realizada com sucesso.' });
  } catch (err) {
    console.error('Erro ao registrar transferência:', err);
    res.status(500).json({ erro: 'Erro interno ao registrar transferência.' });
  }
};