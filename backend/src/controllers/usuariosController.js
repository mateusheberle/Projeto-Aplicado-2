const db     = require('../config/database');
const crypto = require('crypto');

function hashSenha(senha) {
  return crypto.createHash('sha256').update(senha).digest('hex');
}

exports.listar = async (req, res) => {
  try {
    const [usuarios] = await db.query(`
      SELECT idUsuario, nome, email
      FROM Usuario
      ORDER BY nome
    `);

    for (const u of usuarios) {
      const [perfis] = await db.query(`
        SELECT p.idPerfil, p.nome, p.permissao
        FROM Perfil p
        INNER JOIN Usuario_Perfil up ON up.idPerfil = p.idPerfil
        WHERE up.idUsuario = ?
      `, [u.idUsuario]);
      u.perfis = perfis;
    }

    res.json(usuarios);
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ erro: 'Erro interno ao listar usuários.' });
  }
};

exports.buscarPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT idUsuario, nome, email FROM Usuario WHERE idUsuario = ?', [id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Usuário não encontrado.' });

    const usuario = rows[0];
    const [perfis] = await db.query(`
      SELECT p.idPerfil, p.nome, p.permissao
      FROM Perfil p
      INNER JOIN Usuario_Perfil up ON up.idPerfil = p.idPerfil
      WHERE up.idUsuario = ?
    `, [id]);
    usuario.perfis = perfis;

    res.json(usuario);
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    res.status(500).json({ erro: 'Erro interno ao buscar usuário.' });
  }
};

exports.criar = async (req, res) => {
  const { nome, email, senha, perfis = [] } = req.body;

  if (!nome || !email || !senha)
    return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios.' });

  try {
    // RF05 — impede duplicidade de e-mail
    const [existe] = await db.query(
      'SELECT idUsuario FROM Usuario WHERE email = ?', [email]
    );
    if (existe.length)
      return res.status(409).json({ erro: 'E-mail já cadastrado.' });

    const hash = hashSenha(senha);

    const [result] = await db.query(
      'INSERT INTO Usuario (nome, email, senha) VALUES (?, ?, ?)',
      [nome, email, hash]
    );
    const novoId = result.insertId;

    if (perfis.length) {
      const valores = perfis.map(idPerfil => [novoId, idPerfil]);
      await db.query(
        'INSERT INTO Usuario_Perfil (idUsuario, idPerfil) VALUES ?', [valores]
      );
    }

    res.status(201).json({ idUsuario: novoId, mensagem: 'Usuário criado com sucesso.' });
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    res.status(500).json({ erro: 'Erro interno ao criar usuário.' });
  }
};

exports.atualizar = async (req, res) => {
  const { id } = req.params;
  const { nome, email, senha, perfis = [] } = req.body;

  if (!nome || !email)
    return res.status(400).json({ erro: 'Nome e e-mail são obrigatórios.' });

  try {
    const [existe] = await db.query(
      'SELECT idUsuario FROM Usuario WHERE idUsuario = ?', [id]
    );
    if (!existe.length)
      return res.status(404).json({ erro: 'Usuário não encontrado.' });

    // RF05 — e-mail duplicado em outro usuário
    const [duplicado] = await db.query(
      'SELECT idUsuario FROM Usuario WHERE email = ? AND idUsuario <> ?', [email, id]
    );
    if (duplicado.length)
      return res.status(409).json({ erro: 'E-mail já cadastrado por outro usuário.' });

    if (senha) {
      const hash = hashSenha(senha);
      await db.query(
        'UPDATE Usuario SET nome = ?, email = ?, senha = ? WHERE idUsuario = ?',
        [nome, email, hash, id]
      );
    } else {
      await db.query(
        'UPDATE Usuario SET nome = ?, email = ? WHERE idUsuario = ?',
        [nome, email, id]
      );
    }

    // Atualiza perfis
    await db.query('DELETE FROM Usuario_Perfil WHERE idUsuario = ?', [id]);
    if (perfis.length) {
      const valores = perfis.map(idPerfil => [id, idPerfil]);
      await db.query(
        'INSERT INTO Usuario_Perfil (idUsuario, idPerfil) VALUES ?', [valores]
      );
    }

    res.json({ mensagem: 'Usuário atualizado com sucesso.' });
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    res.status(500).json({ erro: 'Erro interno ao atualizar usuário.' });
  }
};

exports.excluir = async (req, res) => {
  const { id } = req.params;
  try {
    const [existe] = await db.query(
      'SELECT idUsuario FROM Usuario WHERE idUsuario = ?', [id]
    );
    if (!existe.length)
      return res.status(404).json({ erro: 'Usuário não encontrado.' });

    const [[dependencias]] = await db.query(
      'SELECT COUNT(*) as totalMovimentacoes FROM Movimentacao WHERE usuario_id = ?',
      [id]
    );
    if (dependencias.totalMovimentacoes > 0) {
      return res.status(409).json({
        erro: 'Não é possível excluir: existem movimentações vinculadas a este usuário.'
      });
    }

    await db.query('DELETE FROM Usuario_Perfil WHERE idUsuario = ?', [id]);
    await db.query('DELETE FROM Usuario WHERE idUsuario = ?', [id]);

    res.json({ mensagem: 'Usuário excluído com sucesso.' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        erro: 'Não é possível excluir: existem registros relacionados a este usuário.'
      });
    }

    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ erro: 'Erro interno ao excluir usuário.' });
  }
};