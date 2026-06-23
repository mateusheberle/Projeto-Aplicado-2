# Ferragens Negrão — Sistema de Gestão de Estoque

Sistema web completo para gerenciamento de estoque, produtos, usuários e movimentações da "Ferragens Negrão". Desenvolvido como projeto aplicado com Node.js no backend, MySQL como banco de dados e frontend em HTML/CSS/JS puro.

## Funcionalidades

- **Autenticação** — login com controle de sessão
- **Dashboard** — visão geral do estoque e movimentações
- **Produtos** — cadastro com SKU, categoria, marca, preço e unidade de medida
- **Estoque** — controle por localização e quantidade
- **Movimentações** — entrada, saída e transferência entre estoques
- **Usuários e Perfis** — gerenciamento de acesso com permissões
- **Relatórios** — visualização de histórico de movimentações
- **Testes E2E** — cobertura com Playwright

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js, Express |
| Banco de dados | MySQL |
| Frontend | HTML5, CSS3, JavaScript |
| Testes | Playwright |

## Estrutura do projeto

```
├── backend/
│   ├── src/
│   │   ├── config/        # Conexão com o banco
│   │   ├── controllers/   # Lógica de negócio
│   │   ├── routes/        # Endpoints da API
│   │   └── server.js
│   ├── database.sql       # Script de criação do banco
│   ├── migrate.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── css/
│   ├── js/
│   └── *.html
├── e2e/                   # Testes end-to-end (Playwright)
└── package.json
```

## Como rodar

### Pré-requisitos

- Node.js 18+
- MySQL 8+

### 1. Banco de dados

```bash
mysql -u root -p < backend/database.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env    # preencha com suas credenciais do MySQL
npm install
npm run dev             # http://localhost:3001
```

Variáveis de ambiente (`.env`):

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=negrao_estoque
PORT=3001
```

### 3. Frontend

O próprio backend serve os arquivos estáticos. Acesse `http://localhost:3001` após iniciar o servidor.

### 4. Testes E2E (opcional)

```bash
npm install
npm test
```

## API

### Autenticação
| Método | Rota | Ação |
|--------|------|------|
| POST | /api/auth/login | Login |

### Produtos
| Método | Rota | Ação |
|--------|------|------|
| GET | /api/produtos | Listar |
| GET | /api/produtos/:id | Buscar por ID |
| POST | /api/produtos | Criar |
| PUT | /api/produtos/:id | Atualizar |
| DELETE | /api/produtos/:id | Excluir |

### Estoque
| Método | Rota | Ação |
|--------|------|------|
| GET | /api/estoque | Listar itens |
| GET | /api/estoque/estoques | Listar estoques |
| POST | /api/estoque | Criar item |
| PUT | /api/estoque/:id | Atualizar |
| DELETE | /api/estoque/:id | Excluir |

### Movimentações
| Método | Rota | Ação |
|--------|------|------|
| GET | /api/movimentacao | Listar histórico |
| POST | /api/movimentacao/entrada | Registrar entrada |
| POST | /api/movimentacao/saida | Registrar saída |
| POST | /api/movimentacao/transferencia | Transferir entre estoques |

### Localizações
| Método | Rota | Ação |
|--------|------|------|
| GET | /api/localizacao | Listar |
| POST | /api/localizacao | Criar |
| PUT | /api/localizacao/:id | Atualizar |
| DELETE | /api/localizacao/:id | Excluir |

### Usuários e Perfis
| Método | Rota | Ação |
|--------|------|------|
| GET | /api/usuarios | Listar |
| POST | /api/usuarios | Criar |
| PUT | /api/usuarios/:id | Atualizar |
| DELETE | /api/usuarios/:id | Excluir |
| GET | /api/perfis | Listar |
| POST | /api/perfis | Criar |
| PUT | /api/perfis/:id | Atualizar |
| DELETE | /api/perfis/:id | Excluir |

## Apresentação

<video src="video.mp4" controls width="100%"></video>

