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
- [Ambientes e Segurança](docs/environments.md)
- [Verificação Financeira (KYC Progressivo)](docs/financial-verification.md)
- [Blockchain como Prova (Fase 26)](docs/blockchain-proof.md)

---

## Fases do MVP Simulado (Implementadas)

| Fase | Status | Descrição |
|------|--------|-----------|
| Fases 1–8 | ✅ Concluído | Base, Auth, Chave, Acordos Simples e com Garantia, Pix Simulado, Disputas, Resolução Admin, Destino de Recebimento |
| Fases 9–14 | ✅ Concluído | App Mobile: criação, detalhe, Pix simulado, contestação, perfil, chave, destino, refresh JWT, notificações in-app |
| Fase 15 | ✅ Concluído | Painel Admin Web (Next.js) — operação humana de disputas |
| Fases 16–17 | ✅ Concluído | Testes unitários (155), Auth Admin real (AdminUser + JWT separado) |
| Fase 18 | ✅ Concluído | Testes E2E com PostgreSQL real (83 testes, 238 total) |
| Fase 19 | ✅ Concluído | Polimento UX Mobile: Date Picker + Time Wheel para prazo |
| Fase 20 | ✅ Concluído | Auditoria final do MVP simulado |
| Fase 21 | ✅ Concluído | Adequação integral ao documento de visão: onboarding, busca, score, configurações, blockchain em mais eventos, admin completo |
| Fase 22 | ✅ Concluído | CI/GitHub Actions: workflow automático em push/PR — testes unitários, E2E com PostgreSQL, build, typecheck mobile e admin |
| Fase 23 | ✅ Concluído | Ambientes e Segurança: ThrottlerModule, CORS por ambiente, GlobalExceptionFilter, validateEnv, docs/environments.md |
| Fase 24 | ✅ Concluído | Fitbank Sandbox / Pix Sandbox: IPaymentProvider, SimulatedProvider, FitbankSandboxProvider, webhook endpoint, 179 testes unitários, 92 E2E |
| Fase 25 | ✅ Concluído | KYC Progressivo: verificação financeira sob demanda, FinancialProfile, CPF validado, bloqueio em acordo com garantia, 206 testes unitários, 101 E2E |
| Fase 26 | ✅ Concluído | Blockchain como Prova: IBlockchainProofProvider, SimulatedProvider, hash canônico SHA-256, sanitização de dados sensíveis, endpoints /proofs, seção mobile, 239 testes unitários, 113 E2E |

## Próximas Etapas (não implementadas)

| Fase | Descrição |
|------|-----------|
| Fase 27 | UX Final e Beta Fechado |

---

## Stack

- **Backend:** NestJS + Prisma + PostgreSQL
- **Mobile:** Expo + React Native + TypeScript
- **Admin:** Next.js (Fase 4)
- **Banco:** PostgreSQL 16
- **Monorepo:** pnpm workspaces
