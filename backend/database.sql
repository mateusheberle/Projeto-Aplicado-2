-- ============================================================
--  FERRAGENS NEGRÃO - Script de criação do banco de dados
-- ============================================================

CREATE DATABASE IF NOT EXISTS negrao_estoque
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE negrao_estoque;

-- PRODUTO
CREATE TABLE IF NOT EXISTS Produto (
  idProduto     INT           NOT NULL AUTO_INCREMENT,
  sku           VARCHAR(50)   NOT NULL UNIQUE COMMENT 'Código único do produto',
  nome          VARCHAR(45)   NOT NULL,
  descricao     VARCHAR(255)  DEFAULT NULL,
  preco         DECIMAL(10,2) NOT NULL,
  categoria     VARCHAR(45)   DEFAULT NULL,
  marca         VARCHAR(45)   DEFAULT NULL,
  unidadeMedida VARCHAR(30)   DEFAULT NULL COMMENT 'Ex: un, kg, m, l',
  estoque       INT           NOT NULL DEFAULT 0 COMMENT 'Quantidade em estoque',
  criadoEm      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizadoEm  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (idProduto),
  INDEX idx_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS Usuario (
  idUsuario INT NOT NULL AUTO_INCREMENT,
  email     VARCHAR(50) NOT NULL UNIQUE COMMENT 'E-mail para login',
  senha     VARCHAR(64) NOT NULL COMMENT 'Senha em hash SHA-256',
  nome      VARCHAR(100) NOT NULL,
  criadoEm  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (idUsuario),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- PERFIL
CREATE TABLE IF NOT EXISTS Perfil ( 
  idPerfil INT NOT NULL AUTO_INCREMENT, 
	nome VARCHAR(45) NOT NULL, 
	permissao VARCHAR(45) NOT NULL, 
	criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	atualizadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (idPerfil)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- USUARIO_PERFIL
CREATE TABLE IF NOT EXISTS Usuario_Perfil ( 
  idUsuario INT NOT NULL, 
  idPerfil INT NOT NULL, 
  PRIMARY KEY (idUsuario, idPerfil), 
  FOREIGN KEY (idUsuario) REFERENCES Usuario(idUsuario), 
  FOREIGN KEY (idPerfil) REFERENCES Perfil(idPerfil)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4; 

-- LOCALIZACAO
CREATE TABLE IF NOT EXISTS Localizacao (
  idLocalizacao INT         NOT NULL AUTO_INCREMENT,
  nome          VARCHAR(45) NOT NULL,
  setor         VARCHAR(45) NOT NULL,
  PRIMARY KEY (idLocalizacao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ESTOQUE
CREATE TABLE IF NOT EXISTS Estoque (
  idEstoque      INT         NOT NULL AUTO_INCREMENT,
  nome           VARCHAR(45) NOT NULL,
  localizacao_id INT         NOT NULL,
  PRIMARY KEY (idEstoque),
  FOREIGN KEY (localizacao_id) REFERENCES Localizacao(idLocalizacao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ESTOQUE_PRODUTO
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

-- MOVIMENTACAO
CREATE TABLE IF NOT EXISTS Movimentacao (
  idMovimentacao     INT          NOT NULL AUTO_INCREMENT,
  produto_id         INT          DEFAULT NULL,
  usuario_id         INT          NOT NULL,
  tipo               INT          NOT NULL COMMENT '1=Entrada, 2=Saida, 3=Transferencia',
  quantidade         INT          NOT NULL,
  data_movimentacao  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estoque_origem_id  INT          DEFAULT NULL,
  estoque_destino_id INT          DEFAULT NULL,
  observacao         VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (idMovimentacao),
  FOREIGN KEY (produto_id)         REFERENCES Produto(idProduto) ON DELETE SET NULL,
  FOREIGN KEY (usuario_id)         REFERENCES Usuario(idUsuario),
  FOREIGN KEY (estoque_origem_id)  REFERENCES Estoque(idEstoque),
  FOREIGN KEY (estoque_destino_id) REFERENCES Estoque(idEstoque)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Inserir usuário administrador padrão (Senha: admin123)
-- Hash SHA-256 de 'admin123' é '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
INSERT INTO Usuario (email, senha, nome) 
VALUES ('admin@negrao.com.br', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Administrador')
ON DUPLICATE KEY UPDATE email = email;

-- Produtos iniciais
INSERT INTO Produto (sku, nome, descricao, preco, categoria, marca, unidadeMedida, estoque) VALUES
('FERR-001', 'Martelo Cabo de Madeira',    'Martelo de bola 27mm com cabo de madeira', 45.90, 'Ferramentas Manuais', 'Tramontina', 'un', 1),
('FERR-002', 'Chave de Fenda Phillips #2',  'Chave de fenda phillips tamanho 2, cabo emborrachado', 12.50, 'Ferramentas Manuais', 'Stanley', 'un', 1),
('PARA-001', 'Parafuso Sextavado M8x30',   'Parafuso sextavado aço zincado M8x30mm', 0.85, 'Parafusos e Fixação', 'Ciser', 'un', 2),
('CABO-001', 'Cabo Elétrico 2,5mm²',       'Cabo flexível 750V seção 2,5mm² por metro', 4.20, 'Elétrica', 'Ficap', 'm', 2),
('FITA-001', 'Fita Isolante Preta 19mm',   'Fita isolante preta 19mm x 10m 750V', 6.90, 'Elétrica', '3M', 'un', 0),
('LIXA-001', 'Lixa para Madeira #120',     'Lixa folha para madeira grão 120', 2.30, 'Abrasivos', 'Norton', 'un', 4),
('ANEL-001', 'Anel de Vedação EPDM 1/2"',  'Anel de vedação borracha EPDM para tubulação 1/2"', 1.10, 'Hidráulica', 'Fortlev', 'un', 1),
('TINTA-001', 'Tinta Látex Branco 18L',    'Tinta látex PVA para paredes internas branca 18 litros', 189.90, 'Tintas', 'Suvinil', 'un', 1)
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  descricao = VALUES(descricao),
  preco = VALUES(preco),
  categoria = VALUES(categoria),
  marca = VALUES(marca),
  unidadeMedida = VALUES(unidadeMedida),
  estoque = VALUES(estoque);

-- Permissões iniciais
INSERT INTO Perfil (nome, permissao)
SELECT 'Administrador', 'ADMIN' FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM Perfil WHERE permissao = 'ADMIN'
);

INSERT INTO Perfil (nome, permissao)
SELECT 'Gerente', 'GERENTE' FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM Perfil WHERE permissao = 'GERENTE'
);

INSERT INTO Perfil (nome, permissao)
SELECT 'Estoquista', 'ESTOQUE' FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM Perfil WHERE permissao = 'ESTOQUE'
);

INSERT INTO Perfil (nome, permissao)
SELECT 'Consultor', 'CONSULTOR' FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM Perfil WHERE permissao = 'CONSULTOR'
);

-- Localizações iniciais
INSERT INTO Localizacao (nome, setor)
SELECT 'Estante 1', 'Almoxarifado' FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM Localizacao WHERE nome = 'Estante 1' AND setor = 'Almoxarifado'
);

INSERT INTO Localizacao (nome, setor)
SELECT 'Balcão', 'Loja' FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM Localizacao WHERE nome = 'Balcão' AND setor = 'Loja'
);
 
-- Estoques iniciais
INSERT INTO Estoque (nome, localizacao_id)
SELECT 'Almoxarifado', l.idLocalizacao
FROM Localizacao l
WHERE l.nome = 'Estante 1' AND l.setor = 'Almoxarifado'
  AND NOT EXISTS (
    SELECT 1 FROM Estoque e WHERE e.nome = 'Almoxarifado'
  );

INSERT INTO Estoque (nome, localizacao_id)
SELECT 'Loja', l.idLocalizacao
FROM Localizacao l
WHERE l.nome = 'Balcão' AND l.setor = 'Loja'
  AND NOT EXISTS (
    SELECT 1 FROM Estoque e WHERE e.nome = 'Loja'
  );

SELECT 'Banco criado com sucesso!' AS Resultado;