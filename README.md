# Selo

> A carteira dos seus combinados.

Selo é uma wallet de microacordos do cotidiano. Registre, formalize e acompanhe combinados com garantias financeiras, score de confiança e prova em blockchain.

---

## Estrutura do Monorepo

```
selo/
├── apps/
│   ├── api/          # Backend NestJS
│   ├── mobile/       # App Expo React Native
│   └── admin/        # Painel Admin Next.js (Fase 4)
├── packages/
│   ├── shared/       # Utilitários compartilhados
│   ├── types/        # Tipos TypeScript compartilhados
│   └── config/       # Configurações compartilhadas
├── docs/             # Documentação técnica
├── docker-compose.yml
├── pnpm-workspace.yaml
└── CLAUDE.md         # Instruções de produto e trabalho
```

---

## Pré-requisitos

- [Node.js 20+](https://nodejs.org/)
- [pnpm 9+](https://pnpm.io/)
- [Docker + Docker Compose](https://www.docker.com/)

---

## Início Rápido

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
cp apps/api/.env.example apps/api/.env
# edite os arquivos .env com seus valores

# 3. Subir banco de dados
pnpm docker:up

# 4. Gerar Prisma Client
pnpm db:generate

# 5. Rodar migrações
pnpm db:migrate

# 6. Iniciar API
pnpm dev:api

# 7. Iniciar mobile (outro terminal)
pnpm dev:mobile
```

---

## Scripts Disponíveis

| Comando            | Descrição                                |
|--------------------|------------------------------------------|
| `pnpm dev:api`     | Inicia a API NestJS em modo watch        |
| `pnpm dev:mobile`  | Inicia o app Expo                        |
| `pnpm dev:admin`   | Inicia o admin Next.js                   |
| `pnpm build:api`   | Build de produção da API                 |
| `pnpm build:admin` | Build de produção do admin               |
| `pnpm docker:up`   | Sobe o PostgreSQL via Docker             |
| `pnpm docker:down` | Derruba os containers Docker             |
| `pnpm db:migrate`  | Roda migrações Prisma                    |
| `pnpm db:generate` | Gera o Prisma Client                     |
| `pnpm db:studio`   | Abre o Prisma Studio                     |
| `pnpm lint`        | Lint em todos os pacotes                 |
| `pnpm typecheck`   | Type check em todos os pacotes           |

---

## Documentação

- [Arquitetura](docs/architecture.md)
- [Como começar](docs/getting-started.md)
- [Autenticação](docs/auth.md)
- [Módulos do backend](docs/modules.md)
- [Banco de dados — entidades e enums](docs/database.md)

---

## Fases do Produto

| Fase | Status | Descrição |
|------|--------|-----------|
| Fase 1 | Em andamento | Base: Auth, Usuários, Acordos simples |
| Fase 2 | Planejado | Garantias e Pix real |
| Fase 3 | Planejado | Score e Disputas |
| Fase 4 | Planejado | Blockchain e Admin |
| Fase 5 | Planejado | BaaS / Fitbank |

---

## Stack

- **Backend:** NestJS + Prisma + PostgreSQL
- **Mobile:** Expo + React Native + TypeScript
- **Admin:** Next.js (Fase 4)
- **Banco:** PostgreSQL 16
- **Monorepo:** pnpm workspaces
