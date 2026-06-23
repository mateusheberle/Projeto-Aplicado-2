const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do frontend (HTML, CSS, JS, Imagens)
app.use(express.static(path.join(__dirname, '../../frontend')));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));
app.use('/api/produtos', require('./routes/produtos'));

app.use('/api/dashboard', require('./routes/dashboard'));

app.use('/api/auth', require('./routes/auth'));

app.use('/api/perfis',   require('./routes/perfis'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/estoque',      require('./routes/estoque'));
app.use('/api/localizacao',  require('./routes/localizacao'));
app.use('/api/movimentacao', require('./routes/movimentacao'));

// Rota padrão para servir o index.html caso acesse caminhos indefinidos (SPA Friendly)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '../../frontend/login.html'));
});

app.use((_, res) => res.status(404).json({ erro: 'Rota não encontrada' }));

app.listen(PORT, () => {
  console.log(`Servidor: http://localhost:${PORT}`);
  console.log(`Produtos: http://localhost:${PORT}/api/produtos`);
  console.log(`Sistema: http://localhost:${PORT}/login.html`);
  console.log(`Perfis:   http://localhost:${PORT}/api/perfis`);
  console.log(`Usuários: http://localhost:${PORT}/api/usuarios`);
  console.log(`Estoque:       http://localhost:${PORT}/api/estoque`);
  console.log(`Localizações:  http://localhost:${PORT}/api/localizacao`);
  console.log(`Movimentações: http://localhost:${PORT}/api/movimentacao`);
});