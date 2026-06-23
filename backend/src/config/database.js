const mysql = require('mysql2/promise');
require('dotenv').config();

const PRODUTOS_INICIAIS = [
  ['FERR-001', 'Martelo Cabo de Madeira', 'Martelo de bola 27mm com cabo de madeira', 45.90, 'Ferramentas Manuais', 'Tramontina', 'un', 1],
  ['FERR-002', 'Chave de Fenda Phillips #2', 'Chave de fenda phillips tamanho 2, cabo emborrachado', 12.50, 'Ferramentas Manuais', 'Stanley', 'un', 1],
  ['PARA-001', 'Parafuso Sextavado M8x30', 'Parafuso sextavado aço zincado M8x30mm', 0.85, 'Parafusos e Fixação', 'Ciser', 'un', 2],
  ['CABO-001', 'Cabo Elétrico 2,5mm²', 'Cabo flexível 750V seção 2,5mm² por metro', 4.20, 'Elétrica', 'Ficap', 'm', 2],
  ['FITA-001', 'Fita Isolante Preta 19mm', 'Fita isolante preta 19mm x 10m 750V', 6.90, 'Elétrica', '3M', 'un', 0],
  ['LIXA-001', 'Lixa para Madeira #120', 'Lixa folha para madeira grão 120', 2.30, 'Abrasivos', 'Norton', 'un', 4],
  ['ANEL-001', 'Anel de Vedação EPDM 1/2"', 'Anel de vedação borracha EPDM para tubulação 1/2"', 1.10, 'Hidráulica', 'Fortlev', 'un', 1],
  ['TINTA-001', 'Tinta Látex Branco 18L', 'Tinta látex PVA para paredes internas branca 18 litros', 189.90, 'Tintas', 'Suvinil', 'un', 1],
];

const PERFIS_INICIAIS = [
  ['Administrador', 'ADMIN'],
  ['Gerente', 'GERENTE'],
  ['Estoquista', 'ESTOQUE'],
  ['Consultor', 'CONSULTOR'],
];

const LOCALIZACOES_INICIAIS = [
  ['Estante 1', 'Almoxarifado'],
  ['Balcao', 'Loja'],
];

const ESTOQUES_INICIAIS = [
  ['Almoxarifado', 1],
  ['Loja', 2],
];

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'negrao_estoque',
  waitForConnections: true,
  connectionLimit: 10,
});

async function ensureMovimentacaoProdutoFk(conn) {
  const [colRows] = await conn.query(`
    SELECT IS_NULLABLE
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Movimentacao'
      AND COLUMN_NAME = 'produto_id'
    LIMIT 1
  `);

  if (!colRows.length) return;

  if (colRows[0].IS_NULLABLE !== 'YES') {
    await conn.query('ALTER TABLE Movimentacao MODIFY produto_id INT NULL');
  }

  const [fkRows] = await conn.query(`
    SELECT rc.CONSTRAINT_NAME, rc.DELETE_RULE
    FROM information_schema.REFERENTIAL_CONSTRAINTS rc
    INNER JOIN information_schema.KEY_COLUMN_USAGE kcu
      ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
     AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
     AND rc.TABLE_NAME = kcu.TABLE_NAME
    WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
      AND rc.TABLE_NAME = 'Movimentacao'
      AND kcu.COLUMN_NAME = 'produto_id'
      AND kcu.REFERENCED_TABLE_NAME = 'Produto'
    LIMIT 1
  `);

  if (!fkRows.length) {
    await conn.query(`
      ALTER TABLE Movimentacao
      ADD CONSTRAINT fk_movimentacao_produto
      FOREIGN KEY (produto_id) REFERENCES Produto(idProduto)
      ON DELETE SET NULL
    `);
    return;
  }

  if (fkRows[0].DELETE_RULE !== 'SET NULL') {
    await conn.query(`ALTER TABLE Movimentacao DROP FOREIGN KEY \`${fkRows[0].CONSTRAINT_NAME}\``);
    await conn.query(`
      ALTER TABLE Movimentacao
      ADD CONSTRAINT fk_movimentacao_produto
      FOREIGN KEY (produto_id) REFERENCES Produto(idProduto)
      ON DELETE SET NULL
    `);
  }
}

async function ensureMovimentacaoDataType(conn) {
  const [colRows] = await conn.query(`
    SELECT DATA_TYPE
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Movimentacao'
      AND COLUMN_NAME = 'data_movimentacao'
    LIMIT 1
  `);

  if (!colRows.length) return;

  if (String(colRows[0].DATA_TYPE).toLowerCase() !== 'datetime') {
    await conn.query(`
      ALTER TABLE Movimentacao
      MODIFY data_movimentacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);
  }
}

const ready = pool.getConnection()
  .then(async conn => {
    console.log('MySQL conectado!');
    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS Produto (
          idProduto     INT           NOT NULL AUTO_INCREMENT,
          sku           VARCHAR(50)   NOT NULL UNIQUE,
          nome          VARCHAR(45)   NOT NULL,
          descricao     VARCHAR(255)  DEFAULT NULL,
          preco         DECIMAL(10,2) NOT NULL,
          categoria     VARCHAR(45)   DEFAULT NULL,
          marca         VARCHAR(45)   DEFAULT NULL,
          unidadeMedida VARCHAR(30)   DEFAULT NULL,
          estoque       INT           NOT NULL DEFAULT 0,
          criadoEm      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
          atualizadoEm  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (idProduto),
          INDEX idx_sku (sku)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS Usuario (
          idUsuario INT NOT NULL AUTO_INCREMENT,
          email     VARCHAR(50) NOT NULL UNIQUE,
          senha     VARCHAR(64) NOT NULL,
          nome      VARCHAR(100) NOT NULL,
          criadoEm  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (idUsuario),
          INDEX idx_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS Perfil (
          idPerfil      INT NOT NULL AUTO_INCREMENT,
          nome          VARCHAR(45) NOT NULL,
          permissao     VARCHAR(45) NOT NULL,
          criadoEm      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          atualizadoEm  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (idPerfil)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS Usuario_Perfil (
          idUsuario INT NOT NULL,
          idPerfil  INT NOT NULL,
          PRIMARY KEY (idUsuario, idPerfil),
          FOREIGN KEY (idUsuario) REFERENCES Usuario(idUsuario),
          FOREIGN KEY (idPerfil) REFERENCES Perfil(idPerfil)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS Localizacao (
          idLocalizacao INT NOT NULL AUTO_INCREMENT,
          nome          VARCHAR(45) NOT NULL,
          setor         VARCHAR(45) NOT NULL,
          PRIMARY KEY (idLocalizacao)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS Estoque (
          idEstoque      INT NOT NULL AUTO_INCREMENT,
          nome           VARCHAR(45) NOT NULL,
          localizacao_id INT NOT NULL,
          PRIMARY KEY (idEstoque),
          FOREIGN KEY (localizacao_id) REFERENCES Localizacao(idLocalizacao)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS Estoque_Produto (
          idEstoque_Produto INT NOT NULL AUTO_INCREMENT,
          estoque_id        INT NOT NULL,
          produto_id        INT NOT NULL,
          quantidade        INT NOT NULL DEFAULT 0,
          quantidade_min    INT NOT NULL DEFAULT 0,
          PRIMARY KEY (idEstoque_Produto),
          FOREIGN KEY (estoque_id) REFERENCES Estoque(idEstoque),
          FOREIGN KEY (produto_id) REFERENCES Produto(idProduto)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS Movimentacao (
          idMovimentacao     INT          NOT NULL AUTO_INCREMENT,
          produto_id         INT          DEFAULT NULL,
          usuario_id         INT          NOT NULL,
          tipo               INT          NOT NULL,
          quantidade         INT          NOT NULL,
          data_movimentacao  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
          estoque_origem_id  INT          DEFAULT NULL,
          estoque_destino_id INT          DEFAULT NULL,
          observacao         VARCHAR(255) DEFAULT NULL,
          PRIMARY KEY (idMovimentacao),
          FOREIGN KEY (produto_id) REFERENCES Produto(idProduto) ON DELETE SET NULL,
          FOREIGN KEY (usuario_id) REFERENCES Usuario(idUsuario),
          FOREIGN KEY (estoque_origem_id) REFERENCES Estoque(idEstoque),
          FOREIGN KEY (estoque_destino_id) REFERENCES Estoque(idEstoque)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await ensureMovimentacaoProdutoFk(conn);
  await ensureMovimentacaoDataType(conn);

      const [[{ totalProdutos }]] = await conn.query('SELECT COUNT(*) as totalProdutos FROM Produto');
      if (totalProdutos === 0) {
        await conn.query(
          'INSERT INTO Produto (sku, nome, descricao, preco, categoria, marca, unidadeMedida, estoque) VALUES ?',
          [PRODUTOS_INICIAIS]
        );
        console.log('MySQL: Produtos iniciais semeados com sucesso!');
      }

      const [[{ totalUsuarios }]] = await conn.query('SELECT COUNT(*) as totalUsuarios FROM Usuario');
      if (totalUsuarios === 0) {
        await conn.query(`
          INSERT INTO Usuario (email, senha, nome)
          VALUES ('admin@negrao.com.br', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Administrador')
        `);
        console.log('MySQL: Usuário administrador padrão semeado com sucesso!');
      }

      const [[{ totalPerfis }]] = await conn.query('SELECT COUNT(*) as totalPerfis FROM Perfil');
      if (totalPerfis === 0) {
        await conn.query(
          'INSERT INTO Perfil (nome, permissao) VALUES ?',
          [PERFIS_INICIAIS]
        );
        console.log('MySQL: Perfis iniciais semeados com sucesso!');
      }

      const [[{ totalLocalizacoes }]] = await conn.query('SELECT COUNT(*) as totalLocalizacoes FROM Localizacao');
      if (totalLocalizacoes === 0) {
        await conn.query(
          'INSERT INTO Localizacao (nome, setor) VALUES ?',
          [LOCALIZACOES_INICIAIS]
        );
        console.log('MySQL: Localizações iniciais semeadas com sucesso!');
      }

      const [[{ totalEstoques }]] = await conn.query('SELECT COUNT(*) as totalEstoques FROM Estoque');
      if (totalEstoques === 0) {
        await conn.query(
          'INSERT INTO Estoque (nome, localizacao_id) VALUES ?',
          [ESTOQUES_INICIAIS]
        );
        console.log('MySQL: Estoques iniciais semeados com sucesso!');
      }
    } catch (e) {
      console.error('Erro ao inicializar banco:', e.message);
    } finally {
      conn.release();
    }
  })
  .catch(err  => console.error('Erro MySQL:', err.message));

module.exports = pool;
module.exports.ready = ready;