const db = require('../config/database');

exports.listar = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM Localizacao ORDER BY idLocalizacao'
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar localizações:', err);
    res.status(500).json({ erro: 'Erro interno ao listar localizações.' });
  }
};

exports.buscarPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT * FROM Localizacao WHERE idLocalizacao = ?', [id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Localização não encontrada.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno.' });
  }
};

exports.criar = async (req, res) => {
  const { nome, setor } = req.body;
  if (!nome || !setor)
    return res.status(400).json({ erro: 'Nome e setor são obrigatórios.' });

  try {
    const [existe] = await db.query(
      'SELECT idLocalizacao FROM Localizacao WHERE nome = ? AND setor = ?', [nome, setor]
    );
    if (existe.length)
      return res.status(409).json({ erro: 'Já existe uma localização com este nome neste setor.' });

    const [result] = await db.query(
      'INSERT INTO Localizacao (nome, setor) VALUES (?, ?)', [nome, setor]
    );
    res.status(201).json({ idLocalizacao: result.insertId, mensagem: 'Localização criada com sucesso.' });
  } catch (err) {
    console.error('Erro ao criar localização:', err);
    res.status(500).json({ erro: 'Erro interno ao criar localização.' });
  }
};

exports.atualizar = async (req, res) => {
  const { id } = req.params;
  const { nome, setor } = req.body;
  if (!nome || !setor)
    return res.status(400).json({ erro: 'Nome e setor são obrigatórios.' });

  try {
    const [existe] = await db.query(
      'SELECT idLocalizacao FROM Localizacao WHERE idLocalizacao = ?', [id]
    );
    if (!existe.length) return res.status(404).json({ erro: 'Localização não encontrada.' });

    const [dup] = await db.query(
      'SELECT idLocalizacao FROM Localizacao WHERE nome = ? AND setor = ? AND idLocalizacao <> ?',
      [nome, setor, id]
    );
    if (dup.length)
      return res.status(409).json({ erro: 'Já existe uma localização com este nome neste setor.' });

    await db.query(
      'UPDATE Localizacao SET nome = ?, setor = ? WHERE idLocalizacao = ?', [nome, setor, id]
    );
    res.json({ mensagem: 'Localização atualizada com sucesso.' });
  } catch (err) {
    console.error('Erro ao atualizar localização:', err);
    res.status(500).json({ erro: 'Erro interno ao atualizar localização.' });
  }
};

exports.excluir = async (req, res) => {
  const { id } = req.params;
  try {
    const [existe] = await db.query(
      'SELECT idLocalizacao FROM Localizacao WHERE idLocalizacao = ?', [id]
    );
    if (!existe.length) return res.status(404).json({ erro: 'Localização não encontrada.' });

    const [vinculado] = await db.query(
      'SELECT idEstoque FROM Estoque WHERE localizacao_id = ?', [id]
    );
    if (vinculado.length)
      return res.status(409).json({ erro: 'Não é possível excluir: localização possui estoques vinculados.' });

    await db.query('DELETE FROM Localizacao WHERE idLocalizacao = ?', [id]);
    res.json({ mensagem: 'Localização excluída com sucesso.' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        erro: 'Não é possível excluir: existem registros relacionados a esta localização.'
      });
    }

    console.error('Erro ao excluir localização:', err);
    res.status(500).json({ erro: 'Erro interno ao excluir localização.' });
  }
};