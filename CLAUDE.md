# CLAUDE.md — Projeto Selo

## O Produto

**Selo** é uma wallet de microacordos do cotidiano.

**Frase pública:** "A carteira dos seus combinados."

O Selo permite que pessoas criem acordos informais com força de registro, podendo incluir garantias financeiras, provas em blockchain, resolução de disputas e score de confiança entre usuários.

---

## Arquitetura Geral

### Monorepo com pnpm workspaces

| App/Package      | Tecnologia                   | Descrição                        |
|------------------|------------------------------|----------------------------------|
| `apps/api`       | NestJS + Prisma + PostgreSQL | Backend principal                |
| `apps/mobile`    | Expo + React Native + TS     | App mobile                       |
| `apps/admin`     | Next.js + TypeScript         | Painel administrativo (Fase 4)   |
| `packages/shared`| TypeScript                   | Utilitários compartilhados       |
| `packages/types` | TypeScript                   | Tipos compartilhados entre apps  |
| `packages/config`| TypeScript                   | Constantes e configs compartilhadas |

---

## Fases do Produto

### Fase 1 — Base (atual)
- Infraestrutura: monorepo, banco, Docker, CI básico
- Auth: registro, login, JWT (access + refresh token)
- Usuários e perfis
- Chaves de recebimento (Pix key do usuário)
- Acordos simples (sem garantia financeira)
- Eventos e histórico de acordos

### Fase 2 — Acordos com Garantia e Pix
- Garantia financeira travada no acordo
- Pagamento via Pix (integração real)
- Fluxo de liberação da garantia após cumprimento
- Destinos de recebimento salvos

### Fase 3 — Score de Confiança e Disputas
- Score de confiança calculado a partir do histórico
- Sistema de disputas com mediação interna
- Notificações push (Expo Notifications)
- Audit logs completos

### Fase 4 — Blockchain e Painel Admin
- Registro de hash de acordos em blockchain (prova imutável)
- Suporte a Ethereum/Polygon testnet (ou outro)
- Painel Admin funcional (Next.js)
- Relatórios e dashboards

### Fase 5 — BaaS / Fitbank
- Integração com Fitbank ou outro BaaS aprovado pelo Banco Central
- Conta digital interna por usuário
- Transferências internas entre usuários Selo
- Saque e depósito via TED/Pix

---

## Stack Técnica

### Backend (`apps/api`)
- **Framework:** NestJS 10+
- **ORM:** Prisma 5+ com PostgreSQL
- **Auth:** JWT (access token 15min + refresh token 7d)
- **Validação:** class-validator + class-transformer
- **Config:** @nestjs/config com dotenv
- **Futura integração:** Fitbank API, Blockchain (Ethereum/Polygon), Pix (via BaaS)

### Mobile (`apps/mobile`)
- **Framework:** Expo SDK 51+ com Expo Router
- **Linguagem:** TypeScript estrito
- **Navegação:** Expo Router (file-based routing)
- **Estado:** A definir na Fase 2 (Zustand ou Context API)
- **HTTP:** axios ou fetch com interceptors

### Admin (`apps/admin`)
- **Framework:** Next.js 14+ com App Router
- **Linguagem:** TypeScript
- **Implementação real:** Fase 4

---

## Módulos do Backend

| Módulo                  | Caminho                            | Descrição                                        |
|-------------------------|------------------------------------|--------------------------------------------------|
| `auth`                  | src/modules/auth                   | Registro, login, JWT, refresh token              |
| `users`                 | src/modules/users                  | CRUD de usuários, busca, status                  |
| `profiles`              | src/modules/profiles               | Perfis públicos dos usuários                     |
| `receiving-keys`        | src/modules/receiving-keys         | Chaves Pix cadastradas pelo usuário              |
| `receiving-destinations`| src/modules/receiving-destinations | Destinos de pagamento salvos pelo usuário        |
| `agreements`            | src/modules/agreements             | CRUD e ciclo de vida dos acordos                 |
| `agreement-events`      | src/modules/agreement-events       | Histórico de eventos de cada acordo              |
| `financial-guarantees`  | src/modules/financial-guarantees   | Garantias financeiras travadas nos acordos       |
| `payments`              | src/modules/payments               | Pagamentos associados a acordos/garantias        |
| `pix`                   | src/modules/pix                    | Integração Pix (Fase 2 — stub na Fase 1)        |
| `disputes`              | src/modules/disputes               | Abertura e resolução de disputas                 |
| `trust-score`           | src/modules/trust-score            | Score de confiança por usuário                   |
| `blockchain-records`    | src/modules/blockchain-records     | Provas em blockchain (Fase 4 — stub na Fase 1)  |
| `notifications`         | src/modules/notifications          | Notificações internas e push                     |
| `audit-logs`            | src/modules/audit-logs             | Auditoria de todas as ações críticas             |
| `admin`                 | src/modules/admin                  | Endpoints exclusivos do painel administrativo    |

---

## Entidades Principais do Banco (Prisma)

- `User` — usuário autenticado
- `Profile` — perfil público
- `ReceivingKey` — chave Pix do usuário (CPF, email, telefone, aleatória)
- `ReceivingDestination` — destinos salvos para pagar
- `Agreement` — acordo (simples ou com garantia)
- `AgreementEvent` — eventos do ciclo de vida do acordo
- `FinancialGuarantee` — garantia financeira travada
- `Payment` — registro de pagamento
- `PixTransaction` — detalhes da transação Pix
- `Dispute` — disputa aberta num acordo
- `TrustScore` — score de confiança do usuário
- `BlockchainRecord` — registro de prova em blockchain
- `Notification` — notificações do usuário
- `AuditLog` — log de auditoria

---

## Regras de Trabalho com Claude

1. **Manter escopo arquitetural completo.** Nunca remover módulos ou simplificar demais a estrutura.
2. **Fases são fronteiras de implementação**, não de arquitetura. A estrutura já contempla todas as fases.
3. **Nomes em inglês no código.** Documentação e comentários podem ser em português.
4. **Não implementar pagamento real, blockchain real ou Fitbank real** sem instrução explícita.
5. **Prisma schema é a fonte da verdade** para o banco de dados. Migrações via `prisma migrate dev`.
6. **Criar DTOs com class-validator** para todas as entradas de API nos controllers.
7. **Usar Guards e Decorators do NestJS** para autenticação (`JwtAuthGuard`) e extração do usuário (`@CurrentUser()`).
8. **Audit log deve ser registrado** para ações críticas: criação de acordo, pagamento, disputa, alteração de status.
9. **Variáveis de ambiente sempre via `.env`** e `@nestjs/config`. Nunca hardcodadas.
10. **Stubs são aceitáveis** para módulos de fases futuras — mas a estrutura (module/controller/service) deve existir.
11. **Ao criar um novo endpoint**, sempre adicionar DTO de input, validação, e resposta tipada.
12. **Testar os comandos** antes de afirmar que funcionam.

---

## Comandos Principais

```bash
# Instalar dependências
pnpm install

# Subir banco de dados (PostgreSQL via Docker)
pnpm docker:up

# Rodar migrações do Prisma
pnpm db:migrate

# Gerar Prisma Client
pnpm db:generate

# Abrir Prisma Studio
pnpm db:studio

# Rodar API em dev
pnpm dev:api

# Rodar mobile em dev
pnpm dev:mobile

# Rodar admin em dev
pnpm dev:admin

# Derrubar Docker
pnpm docker:down
```

---

## Variáveis de Ambiente

Ver `.env.example` na raiz do projeto e em `apps/api/.env.example`.

---

## Convenções

- **Branches:** `main` (produção), `dev` (desenvolvimento), `feat/nome`, `fix/nome`
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
- **PRs:** sempre de `feat/*` ou `fix/*` → `dev` → `main`
- **Arquivos de módulo NestJS:** `{name}.module.ts`, `{name}.controller.ts`, `{name}.service.ts`
- **DTOs:** pasta `dto/` dentro de cada módulo, com sufixo `create-{name}.dto.ts`, `update-{name}.dto.ts`
- **Entities:** pasta `entities/` dentro de cada módulo quando necessário (tipos de resposta)
