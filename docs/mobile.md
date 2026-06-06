# Selo Mobile — Documentação

## Visão Geral

O app mobile do Selo é construído com **Expo SDK 51** + **Expo Router** (file-based routing). Tem aparência de banco digital moderno: bottom navigation, cartões financeiros, filtros visuais e estados claros.

---

## Estrutura

```
apps/mobile/
├── app/
│   ├── _layout.tsx            # Root layout (SafeAreaProvider + Stack)
│   ├── index.tsx              # Auth check — redireciona para (auth) ou (app)
│   ├── (auth)/
│   │   ├── _layout.tsx        # Stack sem header
│   │   ├── login.tsx          # Tela de login com formulário real
│   │   └── register.tsx       # Tela de cadastro com formulário real
│   └── (app)/
│       ├── _layout.tsx        # Bottom Tabs com botão Criar flutuante
│       ├── home.tsx           # Home Wallet
│       ├── agreements.tsx     # Lista de combinados com filtros
│       ├── create.tsx         # Criar combinado (placeholder)
│       └── profile.tsx        # Perfil do usuário
├── src/
│   ├── theme/
│   │   └── index.ts           # Cores, espaçamentos, bordas, sombras, tipografia
│   ├── types/
│   │   ├── api.ts             # Tipos de resposta da API (alinhados com backend)
│   │   └── navigation.ts      # Parâmetros de navegação
│   ├── services/
│   │   ├── api.ts             # Cliente HTTP base (fetch + SecureStore)
│   │   ├── auth.service.ts    # Login, register, logout, getMe
│   │   ├── agreements.service.ts # CRUD de combinados
│   │   ├── wallet.service.ts  # GET /agreements/summary
│   │   ├── receiving-keys.service.ts     # Chaves de recebimento
│   │   └── receiving-destinations.service.ts # Destinos de recebimento
│   ├── hooks/
│   │   ├── useAuth.ts         # Login/register/logout com navigation
│   │   ├── useAuthState.ts    # Verifica token em SecureStore
│   │   ├── useAgreements.ts   # Listagem com filtros
│   │   ├── useSummary.ts      # Home wallet summary
│   │   └── useProfile.ts      # Perfil + chave + destino (Promise.allSettled)
│   └── components/
│       ├── index.ts           # Re-exports
│       ├── StatusBadge.tsx    # Badge de status (operacional + financeiro)
│       ├── AgreementCard.tsx  # Card de acordo — suporta AgreementSummaryItem e AgreementListItem
│       ├── EmptyState.tsx     # Estado vazio com ícone e mensagem
│       ├── LoadingState.tsx   # Spinner + SkeletonCard simplificado
│       ├── PrimaryButton.tsx  # Botão com variants: primary, secondary, ghost, danger
│       ├── FinancialCard.tsx  # Card de valor (a receber, a pagar, protegido)
│       └── SectionHeader.tsx  # Cabeçalho de seção com badge de contador
├── expo-env.d.ts              # Declaração global de process.env.EXPO_PUBLIC_*
└── package.json               # @expo/vector-icons adicionado na Fase 9
```

---

## Design System

| Token | Valor |
|---|---|
| Primary | `#5B21B6` (roxo profundo) |
| Accent | `#10B981` (verde — valores positivos) |
| Warning | `#F59E0B` (âmbar — pendências) |
| Danger | `#EF4444` (vermelho — disputas) |
| Background | `#F2F2F7` (cinza iOS-like) |
| Card | `#FFFFFF` |
| Dark header | `#1E1B4B` (identidade do app) |

Tokens definidos em `src/theme/index.ts`: `Colors`, `Spacing`, `Radii`, `FontSize`, `FontWeight`, `Shadow`.

---

## Navegação

```
index.tsx
  └─ Verifica accessToken no SecureStore
       ├─ Token presente → (app)/home
       └─ Sem token → (auth)/login

(auth)
  ├─ login.tsx
  └─ register.tsx

(app)  [Bottom Tabs]
  ├─ home.tsx         Tab: Início  (ícone: wallet-outline)
  ├─ agreements.tsx   Tab: Combinados (ícone: document-text-outline)
  ├─ create.tsx       Tab: + (botão central flutuante, roxo elevado)
  └─ profile.tsx      Tab: Perfil (ícone: person-outline)
```

O botão central "Criar" é um `tabBarButton` customizado com `top: -18` e sombra elevada.

---

## Telas

### Início (Home Wallet)

Consome `GET /api/v1/agreements/summary`.

Exibe:
- Saudação com primeiro nome do usuário
- Badge de score de confiança (cor + nível)
- Minha chave Selo (`@handle`) com ações Copiar e Compartilhar
- 3 cartões financeiros: Valores a receber / A pagar / Protegido
- Chips de estatísticas: Ativos, Com garantia, Em disputa, Vence em breve
- Ações rápidas: Criar combinado, Ver todos, Compartilhar chave
- Seção "Aguardando você" (pendingMyAction)
- Seção "Em disputa" (se houver)
- Seção "Recentes" com estado vazio descritivo

**Fallback offline:** mostra mensagem de erro com botão "Tentar novamente". Não quebra.

### Combinados (Agreements)

Consome `GET /api/v1/agreements` com filtros.

Filtros disponíveis:
| Chip | Parâmetro enviado |
|---|---|
| Todos | — |
| Ativos | `status=ACTIVE` |
| Aguardando aceite | `status=AWAITING_ACCEPTANCE` |
| A pagar | `financialStatus=AWAITING_PAYMENT` |
| A receber | `myRole=receiver` |
| Com garantia | `hasGuarantee=true` |
| Em disputa | `inDispute=true` |
| Aguardando minha ação | `pendingMyAction=true` |
| Concluídos | `status=COMPLETED` |

Cada card exibe: título, contraparte, valor, status operacional + financeiro, ícone de garantia/disputa, prazo.

### Criar Combinado

Tela placeholder com 4 opções em cards:
- Valor a receber
- Valor a pagar
- Acordo personalizado
- Acordo com garantia

Ao tocar: `Alert.alert("Em breve", ...)`. Banner explicativo na tela.

### Perfil

Consome em paralelo (`Promise.allSettled`):
- `GET /api/v1/auth/me`
- `GET /api/v1/receiving-keys/me`
- `GET /api/v1/receiving-destinations/me`

Exibe:
- Avatar com iniciais do nome
- Nome completo e e-mail
- Score de confiança com cor por nível
- Chave Selo (`@handle`) com botões Copiar e Compartilhar
- Destinos de recebimento com `maskedValue` e badge "Padrão"
- Menu: Configurações (placeholder) + Sair

---

## Endpoints Consumidos

| Método | Rota | Tela |
|---|---|---|
| POST | `/api/v1/auth/register` | Cadastro |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/logout` | Perfil |
| GET | `/api/v1/auth/me` | Perfil |
| GET | `/api/v1/agreements/summary` | Home |
| GET | `/api/v1/agreements` | Combinados |
| GET | `/api/v1/receiving-keys/me` | Perfil |
| GET | `/api/v1/receiving-destinations/me` | Perfil |

---

## Como rodar

### Pré-requisitos

```bash
# 1. Backend rodando na porta 3000
pnpm docker:up
pnpm dev:api

# 2. App mobile
pnpm dev:mobile
# Ou especificamente para Android/iOS:
pnpm --filter @selo/mobile android
pnpm --filter @selo/mobile ios
```

### URL da API

Por padrão: `http://localhost:3000/api/v1`.

Para configurar outra URL, defina `EXPO_PUBLIC_API_URL` no ambiente antes de iniciar o bundler:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api/v1 pnpm dev:mobile
```

> **Android real:** use o IP local da máquina (ex: `http://192.168.1.100:3000`). Emulador Android usa `http://10.0.2.2:3000`.

### Token de acesso

O token JWT é armazenado via `expo-secure-store`. Para testes:
1. Acesse a tela de login ou cadastro.
2. Faça login com `email` + `senha` de usuário existente (criado via API ou Prisma Studio).
3. O token fica salvo automaticamente para as próximas sessões.

---

## Limitações desta fase (Fase 9)

| Limitação | Quando resolve |
|---|---|
| Fluxo de criação de combinado não implementado | Fase 10 |
| Detalhe do acordo não implementado | Fase 10 |
| Notificações push não implementadas | Fase 11 |
| Refresh automático do token (401 → refresh → retry) | Fase 10 |
| Animações de transição entre telas | Fase 10 |
| Configurações de perfil (edição de nome, avatar) | Fase 10 |
| Gerenciamento de chaves e destinos pelo app | Fase 10 |

---

## Arquivos implementados/alterados

| Arquivo | Ação |
|---|---|
| `apps/mobile/package.json` | Adicionado `@expo/vector-icons` |
| `apps/mobile/expo-env.d.ts` | Criado — declara `process.env.EXPO_PUBLIC_*` |
| `apps/mobile/src/theme/index.ts` | Criado |
| `apps/mobile/src/types/api.ts` | Criado |
| `apps/mobile/src/types/navigation.ts` | Atualizado (add `create` tab) |
| `apps/mobile/src/services/auth.service.ts` | Reescrito (firstName/lastName) |
| `apps/mobile/src/services/agreements.service.ts` | Reescrito (tipos locais, POST corretos) |
| `apps/mobile/src/services/wallet.service.ts` | Criado |
| `apps/mobile/src/services/receiving-keys.service.ts` | Criado |
| `apps/mobile/src/services/receiving-destinations.service.ts` | Criado |
| `apps/mobile/src/hooks/useAuth.ts` | Atualizado (firstName/lastName) |
| `apps/mobile/src/hooks/useAuthState.ts` | Criado |
| `apps/mobile/src/hooks/useSummary.ts` | Criado |
| `apps/mobile/src/hooks/useProfile.ts` | Criado |
| `apps/mobile/src/hooks/useAgreements.ts` | Reescrito (filtros) |
| `apps/mobile/src/components/index.ts` | Reescrito |
| `apps/mobile/src/components/StatusBadge.tsx` | Criado |
| `apps/mobile/src/components/AgreementCard.tsx` | Criado |
| `apps/mobile/src/components/EmptyState.tsx` | Criado |
| `apps/mobile/src/components/LoadingState.tsx` | Criado |
| `apps/mobile/src/components/PrimaryButton.tsx` | Criado |
| `apps/mobile/src/components/FinancialCard.tsx` | Criado |
| `apps/mobile/src/components/SectionHeader.tsx` | Criado |
| `apps/mobile/app/_layout.tsx` | Reescrito (SafeAreaProvider) |
| `apps/mobile/app/index.tsx` | Reescrito (auth check assíncrono) |
| `apps/mobile/app/(auth)/login.tsx` | Reescrito (formulário real) |
| `apps/mobile/app/(auth)/register.tsx` | Reescrito (formulário real) |
| `apps/mobile/app/(app)/_layout.tsx` | Reescrito (4 tabs + botão criar) |
| `apps/mobile/app/(app)/home.tsx` | Reescrito (Home Wallet completa) |
| `apps/mobile/app/(app)/agreements.tsx` | Reescrito (lista + filtros) |
| `apps/mobile/app/(app)/create.tsx` | Criado (placeholder) |
| `apps/mobile/app/(app)/profile.tsx` | Reescrito (perfil completo) |
