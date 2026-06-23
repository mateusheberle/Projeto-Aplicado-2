const db = require('../config/database');

const obterDadosDashboard = async (req, res) => {
  try {
    // 1. Total de Produtos
    const [[{ totalProdutos }]] = await db.query('SELECT COUNT(*) as totalProdutos FROM Produto');

    // 2. Valor Total do Estoque (soma de preco * estoque)
    const [[{ valorEstoque }]] = await db.query('SELECT COALESCE(SUM(preco * estoque), 0) as valorEstoque FROM Produto');

    // 3. Total de Categorias
    const [[{ totalCategorias }]] = await db.query(
      'SELECT COUNT(DISTINCT categoria) as totalCategorias FROM Produto WHERE categoria IS NOT NULL AND categoria != ""'
    );

    // 4. Produto Mais Caro (nome e preço)
    const [[produtoMaisCaro]] = await db.query(
      'SELECT nome, preco FROM Produto ORDER BY preco DESC LIMIT 1'
    );

    // 5. Produtos por Categoria (quantidade e porcentagem de produtos)
    const [categorias] = await db.query(
      `SELECT 
         categoria, 
         COUNT(*) as quantidade,
         (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Produto)) as porcentagem
       FROM Produto 
       WHERE categoria IS NOT NULL AND categoria != ""
       GROUP BY categoria 
       ORDER BY quantidade DESC`
    );

    // 6. Estoque Baixo (produtos com estoque < 5, ordenados pelo menor estoque)
    const [estoqueBaixo] = await db.query(
      'SELECT nome, estoque FROM Produto WHERE estoque < 5 ORDER BY estoque ASC, nome ASC'
    );

    // 7. Produtos Mais Caros (top 3)
    const [produtosMaisCaros] = await db.query(
      'SELECT nome, categoria, marca, preco FROM Produto ORDER BY preco DESC LIMIT 3'
    );

    res.json({
      cards: {
        totalProdutos,
        valorEstoque: Number(valorEstoque),
        totalCategorias,
        produtoMaisCaro: produtoMaisCaro ? { nome: produtoMaisCaro.nome, preco: Number(produtoMaisCaro.preco) } : null
      },
      categorias,
      estoqueBaixo,
      produtosMaisCaros
    });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao gerar dados do dashboard', detalhe: err.message });
  }
};

module.exports = { obterDadosDashboard };
