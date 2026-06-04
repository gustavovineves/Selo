# Progresso do Projeto Selo

Última atualização: 2026-06-04

---

## 1. Visão do Produto

**Selo** é uma wallet de microacordos do cotidiano.

**Frase pública:** "A carteira dos seus combinados."

### Princípios do produto

- O Selo registra, formaliza e acompanha combinados entre pessoas.
- **Blockchain como prova, não como custódia.** A blockchain é usada para registrar o hash dos termos do acordo como prova imutável de existência, não para movimentar ou guardar dinheiro.
- **Dinheiro fica com parceiro financeiro.** Em acordos com garantia, os fundos ficam custodiados com um parceiro BaaS (Fitbank ou equivalente) — nunca diretamente na blockchain.
- O produto terá acordo simples (sem dinheiro envolvido), acordo com garantia (Pix + trava de fundos), score de confiança e sistema de disputas.

---

## 2. Estado Técnico Atual

| Item | Status |
|------|--------|
| Monorepo pnpm | ✅ Criado |
| PostgreSQL via Docker | ✅ Rodando na porta **5434** |
| Schema Prisma | ✅ 22 models, 37 enums |
| Migration inicial (`init_complete_schema`) | ✅ Aplicada |
| Prisma Client | ✅ Gerado |
| Auth / Usuários / Sessão | ✅ Implementado (Fase 2) |
| Git local | ✅ Limpo após commit da Fase 2 |

### Estrutura do monorepo

```
apps/api/       NestJS + Prisma + PostgreSQL (backend)
apps/mobile/    Expo React Native (base criada, não integrado)
apps/admin/     Next.js (base criada, Fase 4)
packages/shared Utilitários compartilhados
packages/types  Tipos TypeScript compartilhados
packages/config Constantes compartilhadas
docs/           Documentação técnica
```

---

## 3. Fase 2 — Autenticação, Sessão e Perfil (Implementada)

### Endpoints disponíveis

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/v1/auth/register` | Não | Cria conta, perfil e score inicial |
| POST | `/api/v1/auth/login` | Não | Autentica e cria sessão |
| POST | `/api/v1/auth/refresh` | Não | Renova access token |
| POST | `/api/v1/auth/logout` | JWT | Revoga sessão atual |
| GET | `/api/v1/auth/me` | JWT | Retorna usuário autenticado |
| PATCH | `/api/v1/users/me/profile` | JWT | Atualiza perfil |
| GET | `/api/v1/users/:id` | JWT | Perfil público de um usuário |

### O que foi implementado

- JWT access token (15min) com `{ sub, email, sid }` — `sid` = session ID
- JWT refresh token (7d) com mesmo payload, secret diferente
- `DeviceSession` criada no register e login com IP, UserAgent e expiresAt
- Detecção de reuso de refresh token: sessão revogada automaticamente se token não bate
- Logout revoga a sessão pelo `sessionId` embutido no access token
- `UserProfile` criado junto com o usuário no registro
- `TrustScore` inicial (score 500, level MEDIUM) criado no registro
- `bcrypt(12)` para senha; senha apenas para desenvolvimento local
- `@Transform` normaliza email para lowercase no DTO

### Decisões importantes desta fase

- **Senha é temporária** para desenvolvimento local. O fluxo final usará código OTP por telefone ou email (sem senha). Ver `docs/auth.md` para o plano de migração.
- **CPF e KYC ficam para o onboarding financeiro** — não solicitados no cadastro inicial.
- Schema Prisma **não foi alterado** nesta fase. Nenhuma migration nova foi necessária.

### Documentação gerada

- [docs/auth.md](auth.md) — endpoints, payloads, exemplos PowerShell/curl, fluxo futuro OTP

---

## 4. O Que NÃO Foi Implementado Ainda

Os módulos abaixo existem como stubs (`NotImplementedException`) e aguardam as fases futuras:

| Funcionalidade | Fase | Módulo |
|---|---|---|
| Chave de Recebimento do App | Fase 3 | `receiving-keys` |
| Destinos de recebimento | Fase 3 | `receiving-destinations` |
| Acordos simples | Fase 4 | `agreements` |
| Acordos com garantia | Fase 4 | `agreements` + `financial-guarantees` |
| Pix (cobrança e payout) | Fase 4 | `pix` + `payments` |
| Score de confiança | Fase 4 | `trust-score` |
| Disputas | Fase 5 | `disputes` |
| Blockchain (prova) | Fase 5 | `blockchain-records` |
| Fitbank / BaaS | Fase 6 | `pix` + `payments` |
| Painel Admin | Fase 6 | `admin` + `apps/admin` |

---

## 5. Próxima Fase

### Fase 3 — Chave de Recebimento do App

Objetivo: permitir que o usuário cadastre suas chaves Pix no Selo para poder receber dinheiro em acordos com garantia.

O que implementar:
- `POST /receiving-keys` — cadastrar chave Pix (CPF, CNPJ, email, telefone, aleatória)
- `GET /receiving-keys` — listar chaves ativas do usuário
- `PATCH /receiving-keys/:id/default` — definir chave padrão
- `DELETE /receiving-keys/:id` — remover chave (soft delete com quarentena)
- Normalização da chave (`normalizedKey`) para unicidade global
- Validação do tipo de chave (formato correto por tipo)
- Regra: chave excluída não pode ser reutilizada no MVP (`normalizedKey @unique`)
- Regra: no máximo uma chave `isDefault = true` por usuário (enforçado pelo serviço)

Referência de schema: [docs/database.md](database.md) — Model `ReceivingKey`

---

## 6. Comandos Úteis

```bash
# Subir banco de dados (PostgreSQL porta 5434)
pnpm docker:up

# Iniciar API em modo desenvolvimento
pnpm dev:api

# Aplicar migrations pendentes
pnpm db:migrate

# Gerar Prisma Client (após mudanças no schema)
pnpm db:generate

# Abrir Prisma Studio
pnpm db:studio

# Ver status do Git
git status

# Ver logs do banco
pnpm docker:logs
```

### Testar autenticação rapidamente (PowerShell)

```powershell
# Registrar
$body = '{"email":"dev@selo.dev","password":"senha-dev-123","firstName":"Dev","lastName":"Selo"}'
$res = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/register" -Method Post -Body $body -ContentType "application/json"
$token = $res.accessToken

# Ver usuário atual
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/me" -Headers @{ Authorization = "Bearer $token" }
```

---

## 7. Links de Documentação

| Arquivo | Conteúdo |
|---------|----------|
| [CLAUDE.md](../CLAUDE.md) | Instruções do produto e regras de trabalho com Claude |
| [docs/architecture.md](architecture.md) | Arquitetura geral e fluxos |
| [docs/auth.md](auth.md) | Autenticação: endpoints, exemplos, fluxo futuro OTP |
| [docs/database.md](database.md) | Todos os 22 models e 37 enums do schema Prisma |
| [docs/modules.md](modules.md) | Endpoints de todos os módulos do backend |
| [docs/getting-started.md](getting-started.md) | Setup inicial do ambiente |
