const db = require('../config/database');
const crypto = require('crypto');

/**
 * Auxiliar para gerar hash SHA-256
 */
function hashSenha(senha) {
  return crypto.createHash('sha256').update(senha).digest('hex');
}

/**
 * Lógica do Login Dinâmico (E-mail ou Nome)
 */
const login = async (req, res) => {
  try {
    const { login: loginInput, senha } = req.body;

    if (!loginInput || !senha) {
      return res.status(400).json({ erro: 'E-mail/Nome e senha são obrigatórios' });
    }

    const hash = hashSenha(senha);

    // Busca dinâmica por email OU nome no banco de dados
    const [[usuario]] = await db.query(
      'SELECT idUsuario, email, nome, senha FROM Usuario WHERE (email = ? OR nome = ?)',
      [loginInput.trim(), loginInput.trim()]
    );

    if (!usuario) {
      return res.status(401).json({ erro: 'Usuário ou e-mail não encontrado' });
    }

    if (usuario.senha !== hash) {
      console.log("senha no bd: ", usuario.senha);
      console.log("hash: ", hash);
      return res.status(401).json({ erro: 'Senha incorreta. Verifique suas credenciais' });
    }

    // Login efetuado com sucesso!
    res.json({
      mensagem: 'Login realizado com sucesso!',
      usuario: {
        idUsuario: usuario.idUsuario,
        email: usuario.email,
        nome: usuario.nome
      },
      token: `sessao_ativa_${usuario.idUsuario}_${Date.now()}`
    });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno ao realizar autenticação', detalhe: err.message });
  }
};

module.exports = { login };
