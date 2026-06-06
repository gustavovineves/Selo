# Painel Admin — Selo (Fase 15)

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

## Autenticação Admin (Provisória — MVP)

A autenticação usa o token estático configurado no backend:

1. No arquivo `apps/api/.env`, defina `ADMIN_TOKEN=seu-token-aqui`
2. No painel, acesse `/login` e cole o mesmo token
3. O token é validado contra `GET /api/v1/admin/health` via header `X-Admin-Token`
4. Se válido, é salvo em `localStorage` e todas as chamadas subsequentes incluem `X-Admin-Token: <token>`

**Importante:** Esta autenticação é provisória para MVP/desenvolvimento.  
Em produção, será substituída por `AdminUser` com JWT separado.

### Segurança implementada

- Token nunca fica hardcoded no código
- Token não é exibido em tela após salvo (input type=password por padrão)
- Logout limpa o token do localStorage
- Se a API retornar 401/403, o token é limpo e o usuário é redirecionado para login automaticamente

---

## Estrutura do Projeto

```
apps/admin/
├── src/
│   ├── app/                        # App Router (Next.js 14)
│   │   ├── layout.tsx              # Root layout com reset CSS
│   │   ├── page.tsx                # Redirect para /login ou /dashboard
│   │   ├── login/
│   │   │   └── page.tsx            # Tela de login com token
│   │   ├── dashboard/
│   │   │   └── page.tsx            # Dashboard com estatísticas gerais
│   │   └── disputes/
│   │       ├── page.tsx            # Lista de contestações com filtros
│   │       └── [id]/
│   │           └── page.tsx        # Detalhe + ações administrativas
│   ├── components/
│   │   ├── AdminLayout.tsx         # Sidebar + navegação principal
│   │   ├── Modal.tsx               # Modal de confirmação reutilizável
│   │   └── StatusBadge.tsx         # Badge de status com cores semânticas
│   └── lib/
│       ├── api.ts                  # Cliente HTTP com X-Admin-Token
│       └── types.ts                # Tipos TypeScript alinhados com o backend
├── .env.example                    # Variáveis de ambiente necessárias
├── next.config.ts                  # Configuração Next.js
├── package.json                    # Scripts: dev, build, typecheck
└── tsconfig.json                   # TypeScript strict mode
```

---

## Telas

### `/login`

- Formulário com campo de token (password mascarado)
- Botão para exibir/ocultar token
- Valida o token chamando `GET /api/v1/admin/health`
- Redireciona para `/dashboard` se válido
- Exibe nota sobre autenticação provisória

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

## Endpoints Consumidos

| Método | Rota | Tela |
|---|---|---|
| GET | `/api/v1/admin/health` | Login (validação do token) |
| GET | `/api/v1/admin/stats` | Dashboard |
| GET | `/api/v1/admin/disputes` | Lista de contestações |
| GET | `/api/v1/admin/disputes/:id` | Detalhe da contestação |
| POST | `/api/v1/admin/disputes/:id/resolve-release` | Modal "Liberar ao recebedor" |
| POST | `/api/v1/admin/disputes/:id/resolve-refund` | Modal "Reembolsar pagador" |

Todos os endpoints enviam `X-Admin-Token: <token>` no header.

---

## Fluxo de Resolução Humana

```
Admin acessa /login → informa ADMIN_TOKEN → validado
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
| Auth por token estático no localStorage | `AdminUser` com JWT separado e sessão segura |
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
