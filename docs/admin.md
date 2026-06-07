# Painel Admin — Selo (Fase 17)

## Objetivo

Painel web para o administrador operar disputas humanas do MVP sem precisar usar Postman ou curl. No MVP, toda contestação é resolvida por análise humana do administrador.

---

## Como rodar

```bash
# 1. Configurar variáveis de ambiente
cp apps/admin/.env.example apps/admin/.env.local
# edite .env.local com a URL da API

# 2. Instalar dependências (já instaladas se você rodou pnpm install na raiz)
pnpm install

# 3. Iniciar o painel (porta 3001)
pnpm dev:admin
# ou diretamente:
pnpm --filter @selo/admin dev
```

A API precisa estar rodando em paralelo:

```bash
pnpm dev:api
```

Acesse: **http://localhost:3001**

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Sim | URL base da API (ex: `http://localhost:3000/api/v1`) |

---

## Autenticação Admin (Fase 17 — AdminUser + JWT)

A autenticação agora usa `AdminUser` com JWT separado do JWT de usuário comum.

### Como funciona

1. Acesse `/login` no painel e informe **email + senha** de um `AdminUser` cadastrado no banco
2. O painel chama `POST /api/v1/admin/auth/login` e recebe um `accessToken` JWT admin
3. O token é salvo em `localStorage` e enviado como `Authorization: Bearer <token>` em todas as chamadas
4. O `AdminJwtGuard` valida: assina com `ADMIN_JWT_SECRET` e exige `payload.type === "admin"`
5. Tokens de usuário comum são **rejeitados** nas rotas admin (secret e payload diferentes)

### Variáveis de ambiente necessárias (apps/api/.env)

```env
ADMIN_JWT_SECRET=seu-segredo-admin-de-pelo-menos-64-chars
ADMIN_JWT_EXPIRES_IN=1d
```

### Endpoints de autenticação admin

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/api/v1/admin/auth/login` | Público | Login com email + senha de AdminUser |
| GET | `/api/v1/admin/auth/me` | AdminJwtGuard | Dados do admin autenticado |
| POST | `/api/v1/admin/auth/logout` | AdminJwtGuard | Logout (stateless; limpa token no client) |

### Payload do JWT admin

```json
{
  "sub": "admin-id",
  "email": "admin@selo.app",
  "role": "ADMIN",
  "type": "admin"
}
```

### Segurança implementada

- JWT assinado com `ADMIN_JWT_SECRET` (diferente do `JWT_SECRET` de usuário)
- `payload.type === "admin"` verificado pelo guard — rejeita tokens de usuário
- Tokens admin são rejeitados em rotas de usuário (ADMIN_JWT_SECRET ≠ JWT_SECRET)
- Senha armazenada com bcrypt (12 rounds)
- Erro genérico "Credenciais inválidas" para email ou senha incorretos
- `passwordHash` nunca retornado em nenhum endpoint
- 401/403 da API limpa o token e redireciona para login automaticamente

### Como criar um AdminUser no banco (dev)

Use o Prisma Studio (`pnpm db:studio`) → tabela `admin_users`, ou insira via SQL:

```sql
INSERT INTO admin_users (id, email, name, password_hash, role, status, created_at, updated_at)
VALUES (gen_random_uuid(), 'admin@selo.app', 'Admin Selo', '<hash-bcrypt>', 'ADMIN', 'ACTIVE', NOW(), NOW());
```

O hash pode ser gerado com `bcrypt.hashSync('sua-senha', 12)` em Node.js.

### Como criar AdminUser de Staging (Fase 28)

Use o script seguro incluso no projeto:

```bash
DATABASE_URL="postgresql://..." \
ADMIN_EMAIL="admin@staging.example.com" \
ADMIN_NAME="Admin Staging" \
ADMIN_PASSWORD="<senha-forte-12-chars>" \
  pnpm create-admin
```

Gere uma senha forte antes:
```bash
openssl rand -base64 24
```

Ver [docs/deploy-staging.md](deploy-staging.md) para instruções completas.

### Admin Apontando para Staging

Configure o arquivo `apps/admin/.env.local` (não commitar):

```env
NEXT_PUBLIC_API_URL=https://api.staging.selo.app/api/v1
NEXT_PUBLIC_APP_ENV=staging
```

Após configurar, faça build e inicie:

```bash
pnpm --filter @selo/admin build
pnpm --filter @selo/admin start
```

---

## Estrutura do Projeto

```
apps/admin/
├── src/
│   ├── app/                        # App Router (Next.js 14)
│   │   ├── layout.tsx              # Root layout com reset CSS
│   │   ├── page.tsx                # Redirect para /login ou /dashboard
│   │   ├── login/
│   │   │   └── page.tsx            # Tela de login AdminUser + JWT
│   │   ├── dashboard/
│   │   │   └── page.tsx            # Dashboard com estatísticas gerais
│   │   ├── disputes/
│   │   │   ├── page.tsx            # Lista de contestações com filtros
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Detalhe + ações administrativas
│   │   ├── users/
│   │   │   └── page.tsx            # Lista de usuários com paginação (Fase 27)
│   │   ├── agreements/
│   │   │   └── page.tsx            # Lista de acordos com filtros (Fase 27)
│   │   └── proofs/
│   │       └── page.tsx            # Consulta de registros de prova por ID (Fase 27)
│   ├── components/
│   │   ├── AdminLayout.tsx         # Sidebar com 5 links de navegação (Fase 27)
│   │   ├── Modal.tsx               # Modal de confirmação reutilizável
│   │   └── StatusBadge.tsx         # Badge de status com cores semânticas
│   └── lib/
│       ├── api.ts                  # Cliente HTTP com JWT admin (Authorization: Bearer)
│       └── types.ts                # Tipos TypeScript alinhados com o backend
├── .env.example                    # Variáveis de ambiente necessárias
├── next.config.ts                  # Configuração Next.js
├── package.json                    # Scripts: dev, build, typecheck
└── tsconfig.json                   # TypeScript strict mode
```

---

## Telas

### `/login`

- Formulário com campos de **email** e **senha** (`AdminUser`)
- Botão para exibir/ocultar senha
- Chama `POST /api/v1/admin/auth/login`; salva JWT admin em `localStorage`
- Redireciona para `/dashboard` se autenticado com sucesso
- Exibe nota indicando que o acesso exige `AdminUser` cadastrado no banco

### `/dashboard`

- Cards de estatísticas: Usuários, Combinados, Contestações totais, Contestações abertas
- Banner de alerta quando há contestações abertas, com link direto para elas
- Atalhos rápidos para lista de contestações
- Data/hora da última atualização dos dados

### `/disputes`

- Tabela com todas as contestações
- Filtros por status: Todas / Abertas / Em análise / Reembolsadas / Liberadas / Encerradas
- Colunas: ID curto, Status, Acordo/Valor, Quem contestou, Pagador → Recebedor, Data
- Botão "Analisar →" (roxo) para abertas; "Ver detalhes" para resolvidas
- Paginação (20 por página)
- Contestações abertas destacadas com fundo âmbar

### `/disputes/[id]`

Detalhe completo organizado em 6 blocos:

| Bloco | Conteúdo |
|---|---|
| Resumo da contestação | Status, abertura, quem abriu, motivo, descrição, decisão (se resolvida) |
| Acordo relacionado | Título, tipo, status operacional/financeiro, valor, prazo |
| Participantes | Pagador, recebedor, demais participantes com papéis |
| Valor protegido | Status da garantia, valor, liberações e reembolsos registrados |
| Evidências e registros formais | Registros formais submetidos pelas partes (tipo, autor, data, conteúdo) |
| Histórico de eventos | Timeline cronológica de todos os eventos do acordo |

**Ações (apenas em contestações abertas):**
- Botão "Liberar ao recebedor" (verde) → abre modal com justificativa obrigatória
- Botão "Reembolsar pagador" (âmbar) → abre modal com justificativa obrigatória

---

## Endpoints Disponíveis

Todos os endpoints enviam `Authorization: Bearer <accessToken>` no header (JWT admin obtido no login).

### Dashboard e Disputas

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/v1/admin/health` | Health check do painel |
| GET | `/api/v1/admin/stats` | Estatísticas gerais |
| GET | `/api/v1/admin/disputes` | Lista de contestações (paginado, filtro por status) |
| GET | `/api/v1/admin/disputes/:id` | Detalhe completo da contestação |
| POST | `/api/v1/admin/disputes/:id/resolve-release` | Resolver liberando ao recebedor |
| POST | `/api/v1/admin/disputes/:id/resolve-refund` | Resolver reembolsando ao pagador |

### Usuários (Fase 21)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/v1/admin/users` | Lista usuários (paginado, filtro por status) |
| GET | `/api/v1/admin/users/:id` | Detalhe do usuário (perfil, score, chaves, contadores) |

**Query params de `/admin/users`:**
- `page` (default 1), `limit` (default 20, máx 100), `status` (filtro por UserStatus)

**Não retorna:** `passwordHash`, tokens, dados sensíveis.

### Acordos (Fase 21)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/v1/admin/agreements` | Lista acordos (paginado, filtros) |
| GET | `/api/v1/admin/agreements/:id` | Detalhe completo do acordo |

**Query params de `/admin/agreements`:**
- `page` (default 1), `limit` (default 20, máx 100), `status` (filtro por operationalStatus), `type` (SIMPLE ou WITH_GUARANTEE)

---

## Fluxo de Resolução Humana

```
Admin acessa /login → informa email + senha → JWT admin obtido
  ↓
/dashboard → vê contestações abertas → clica "Ver contestações"
  ↓
/disputes → filtra por "Abertas" → clica "Analisar →" em uma disputa
  ↓
/disputes/[id]
  ├── Lê: Resumo, Acordo, Participantes, Valor protegido
  ├── Lê: Evidências e registros formais submetidos pelas partes
  ├── Lê: Histórico cronológico de eventos
  └── Decide:
        ├── "Liberar ao recebedor" → modal → justificativa (≥10 chars) → confirma
        │     → POST /resolve-release → disputa encerrada
        └── "Reembolsar pagador" → modal → justificativa (≥10 chars) → confirma
              → POST /resolve-refund → disputa encerrada
```

Após resolução:
- A disputa muda de `OPEN` para `RESOLVED_FAVOR_COUNTERPART` ou `RESOLVED_FAVOR_CREATOR`
- O acordo tem status atualizado (COMPLETED ou CANCELLED)
- A garantia financeira tem status atualizado (PAID_OUT ou REFUNDED)
- Score de confiança dos participantes é atualizado (+30 vencedor, -20 perdedor)
- AuditLog registra a decisão com actorType=ADMIN
- Notificações in-app são enviadas a ambos os participantes

---

## Terminologia no Painel

O painel usa linguagem administrativa formal. Nunca usa termos de chat.

| No backend | No painel admin |
|---|---|
| `DisputeMessage` | Evidência / Registro formal |
| `messages` | Evidências e registros formais |
| `OPEN` | Aberta |
| `RESOLVED_FAVOR_CREATOR` | Reembolsado ao pagador |
| `RESOLVED_FAVOR_COUNTERPART` | Liberado ao recebedor |
| `FROZEN_DISPUTE` | Travado — Em contestação |
| `FUNDS_HELD` | Valor protegido |
| `simulated: true` | (simulado) |

---

## Design System

O painel usa inline styles com uma paleta consistente:

| Token | Valor | Uso |
|---|---|---|
| Sidebar | `#1E1B4B` | Fundo da sidebar |
| Primary | `#5B21B6` | Ações principais, links ativos |
| Success | `#059669` | Liberação, valores positivos |
| Warning | `#D97706` | Reembolso, alertas, contestações abertas |
| Danger | `#EF4444` | Erros |
| Content bg | `#F2F2F7` | Fundo das páginas |
| Card | `#FFFFFF` | Cartões de conteúdo |

---

## Validações de Segurança

- Justificativa obrigatória (mínimo 10 caracteres) nos modais de resolução — validação client-side + backend
- Botões de ação só aparecem para contestações `OPEN`
- Contestação já resolvida: botões não aparecem (backend também bloqueia com HTTP 400)
- 401/403 da API: token limpo automaticamente + redirect para login
- Token nunca hardcoded no código

---

## Limitações (MVP)

| Limitação | Plano futuro |
|---|---|
| Auth por JWT (stateless) — sem invalidação server-side | Sessão de admin com blacklist ou refresh token |
| Sem paginação de evidências | Paginação com limite e cursor |
| Sem filtro por data ou valor | Filtros avançados |
| Sem upload de arquivo como evidência | Upload de imagem/PDF |
| Sem envio de nota administrativa pela UI | Campo de `adminNote` na interface |
| Sem painel de usuários ou acordos gerais | Módulos de gestão expandidos na Fase 4 |
| Pix/Fitbank simulado | Integração real com BaaS na Fase 5 |
| Blockchain simulada | Integração real na Fase 4 |

---

## Validação TypeScript

```bash
pnpm --filter @selo/admin typecheck
```

Saída esperada: sem erros TypeScript.
