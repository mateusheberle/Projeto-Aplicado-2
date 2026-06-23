const db = require('../config/database');

exports.listar = async (req, res) => {
  try {
    const [perfis] = await db.query(`
      SELECT
        p.idPerfil,
        p.nome,
        p.permissao,
        COUNT(up.idUsuario) AS totalUsuarios
      FROM Perfil p
      LEFT JOIN Usuario_Perfil up ON up.idPerfil = p.idPerfil
      GROUP BY p.idPerfil, p.nome, p.permissao
      ORDER BY p.nome
    `);
    res.json(perfis);
  } catch (err) {
    console.error('Erro ao listar perfis:', err);
    res.status(500).json({ erro: 'Erro interno ao listar perfis.' });
  }
};

exports.buscarPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT idPerfil, nome, permissao FROM Perfil WHERE idPerfil = ?',
      [id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Perfil não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    res.status(500).json({ erro: 'Erro interno ao buscar perfil.' });
  }
};

exports.criar = async (req, res) => {
  const { nome, permissao } = req.body;

  if (!nome || !permissao) {
    return res.status(400).json({ erro: 'Nome e permissão são obrigatórios.' });
  }

  const permissoesValidas = ['ADMIN', 'GERENTE', 'ESTOQUE', 'VENDEDOR'];
  if (!permissoesValidas.includes(permissao)) {
    return res.status(400).json({ erro: 'Permissão inválida.' });
  }

  try {
    // RF05 — impede nome duplicado
    const [existe] = await db.query(
      'SELECT idPerfil FROM Perfil WHERE nome = ?',
      [nome]
    );
    if (existe.length) return res.status(409).json({ erro: 'Já existe um perfil com este nome.' });

    const [result] = await db.query(
      'INSERT INTO Perfil (nome, permissao) VALUES (?, ?)',
      [nome, permissao]
    );
    res.status(201).json({ idPerfil: result.insertId, mensagem: 'Perfil criado com sucesso.' });
  } catch (err) {
    console.error('Erro ao criar perfil:', err);
    res.status(500).json({ erro: 'Erro interno ao criar perfil.' });
  }
};

exports.atualizar = async (req, res) => {
  const { id } = req.params;
  const { nome, permissao } = req.body;

  if (!nome || !permissao) {
    return res.status(400).json({ erro: 'Nome e permissão são obrigatórios.' });
  }

  const permissoesValidas = ['ADMIN', 'GERENTE', 'ESTOQUE', 'VENDEDOR'];
  if (!permissoesValidas.includes(permissao)) {
    return res.status(400).json({ erro: 'Permissão inválida.' });
  }

  try {
    const [existe] = await db.query(
      'SELECT idPerfil FROM Perfil WHERE idPerfil = ?',
      [id]
    );
    if (!existe.length) return res.status(404).json({ erro: 'Perfil não encontrado.' });

    // RF05 — nome duplicado em outro perfil
    const [duplicado] = await db.query(
      'SELECT idPerfil FROM Perfil WHERE nome = ? AND idPerfil <> ?',
      [nome, id]
    );
    if (duplicado.length) return res.status(409).json({ erro: 'Já existe um perfil com este nome.' });

    await db.query(
      'UPDATE Perfil SET nome = ?, permissao = ? WHERE idPerfil = ?',
      [nome, permissao, id]
    );
    res.json({ mensagem: 'Perfil atualizado com sucesso.' });
  } catch (err) {
    console.error('Erro ao atualizar perfil:', err);
    res.status(500).json({ erro: 'Erro interno ao atualizar perfil.' });
  }
};

exports.excluir = async (req, res) => {
  const { id } = req.params;
  try {
    const [existe] = await db.query(
      'SELECT idPerfil FROM Perfil WHERE idPerfil = ?',
      [id]
    );
    if (!existe.length) return res.status(404).json({ erro: 'Perfil não encontrado.' });

    // Bloqueia exclusão se houver usuários vinculados
    const [vinculados] = await db.query(
      'SELECT idUsuario FROM Usuario_Perfil WHERE idPerfil = ?',
      [id]
    );
    if (vinculados.length) {
      return res.status(409).json({
        erro: 'Não é possível excluir: perfil possui usuários vinculados.'
      });
    }

    await db.query('DELETE FROM Perfil WHERE idPerfil = ?', [id]);
    res.json({ mensagem: 'Perfil excluído com sucesso.' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        erro: 'Não é possível excluir: existem registros relacionados a este perfil.'
      });
    }

    console.error('Erro ao excluir perfil:', err);
    res.status(500).json({ erro: 'Erro interno ao excluir perfil.' });
  }
};
