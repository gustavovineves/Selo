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

## Fase 10 — Fluxo de Criação + Detalhe (Implementado)

### Novas telas

| Tela | Arquivo | Descrição |
|---|---|---|
| Wizard de criação | `app/create-agreement.tsx` | 5 etapas: quem, título, valor, prazo, resumo |
| Detalhe do acordo | `app/agreement/[id].tsx` | Exibe dados completos + ações contextuais |

### Novos componentes

| Componente | Arquivo | Descrição |
|---|---|---|
| `StepHeader` | `src/components/StepHeader.tsx` | Cabeçalho com progresso e navegação entre etapas |
| `ReceiverPreviewCard` | `src/components/ReceiverPreviewCard.tsx` | Card de confirmação visual do recebedor resolvido |

### Wizard de criação — etapas

1. **Quem** — input de chave + botão Confirmar → resolve via `GET /receiving-keys/resolve/:key`
2. **Título + Descrição** — título obrigatório (3–100 chars), descrição opcional
3. **Valor** — obrigatório para garantia, opcional com "Pular" para os demais
4. **Prazo** — chips: Sem prazo / 7 dias / 30 dias / Personalizado (DD/MM/AAAA)
5. **Resumo** — frase em linguagem humana + detalhes + "Criar combinado"
6. **Sucesso** — resumo do acordo criado, botões "Ver acordo" e "Voltar para início"

### Endpoints consumidos (Fase 10)

| Método | Rota | Tela |
|---|---|---|
| GET | `/api/v1/receiving-keys/resolve/:key` | Wizard — etapa "Quem" |
| POST | `/api/v1/agreements/simple` | Wizard — tipos receive, pay, custom |
| POST | `/api/v1/agreements/guaranteed` | Wizard — tipo guaranteed |
| GET | `/api/v1/agreements/:id` | Tela de detalhe |
| POST | `/api/v1/agreements/:id/accept` | Ação: aceitar (contraparte) |
| POST | `/api/v1/agreements/:id/decline` | Ação: recusar (contraparte) |
| POST | `/api/v1/agreements/:id/cancel` | Ação: cancelar |
| POST | `/api/v1/agreements/:id/complete` | Ação: concluir (simples) |
| POST | `/api/v1/agreements/:id/confirm-completion` | Ação: confirmar conclusão (garantia) |

### Limitações desta fase (Fase 10)

| Limitação | Quando resolve |
|---|---|
| Depósito Pix no app (payment-intents) | Fase 11 ✅ |
| Abertura de disputa pelo app | Fase 11 ✅ |
| Notificações push | Fase 12 |
| Refresh automático do token (401 → refresh → retry) | Fase 12 |
| Animações de transição entre telas | Fase 12 |
| Configurações de perfil (edição de nome, avatar) | Fase 12 |
| Gerenciamento de chaves e destinos pelo app | Fase 12 |
| Reembolso pelo app (botão refund) | Fase 12 |

---

## Fase 11 — Garantia, Pix Simulado e Contestação Formal (Implementado)

### Telas alteradas

| Tela | Arquivo | O que mudou |
|---|---|---|
| Detalhe do acordo | `app/agreement/[id].tsx` | Reescrita completa com todos os fluxos da Fase 11 |

### Novos serviços

| Serviço | Arquivo | Métodos |
|---|---|---|
| `paymentsService` | `src/services/payments.service.ts` | `simulateConfirmation(paymentIntentId)` |
| `disputesService` | `src/services/disputes.service.ts` | `getById(disputeId)`, `addEvidence(disputeId, payload)` |

### Métodos adicionados a serviços existentes

| Serviço | Método | Endpoint |
|---|---|---|
| `agreementsService` | `createPaymentIntent(id)` | `POST /agreements/:id/payment-intents` |
| `agreementsService` | `openDispute(id, payload)` | `POST /agreements/:id/dispute` |
| `agreementsService` | `getDispute(id)` | `GET /agreements/:id/dispute` |

### Novos tipos em `api.ts`

- `PaymentIntentResponse` — resposta de `POST /payment-intents` com `pixCharge.qrCode`
- `SimulateConfirmationResponse` — resposta de `simulate-confirmation` com estado da garantia
- `OpenDisputePayload` — payload para abrir contestação (`reason`, `description`)
- `DisputeMessage` — evidência/registro formal da contestação
- `DisputeDetail` — detalhe completo da contestação com histórico formal
- `AddEvidencePayload` — payload para enviar evidência

### Fluxo Pix simulado no app

1. Acordo `WITH_GUARANTEE` + aceito + `AWAITING_PAYMENT` + criador → **card "Pagar com Pix"**
2. Botão **"Gerar Pix"** → `POST /payment-intents` → exibe código QR/Pix copiável
3. Botão **"Compartilhar código Pix"** → compartilha código via share nativo
4. Botão **"Simular pagamento confirmado"** → `POST /simulate-confirmation` → recarrega detalhe
5. `financialStatus → FUNDS_HELD` → **card "Valor protegido"** exibido

### Fluxo de dupla confirmação no app

| Estado | Mensagem exibida |
|---|---|
| 1ª confirmação (`ops = ACTIVE`) | "Depois da sua confirmação, a outra parte ainda precisará confirmar para o valor ser liberado." |
| 2ª confirmação (`ops = AWAITING_CONFIRMATION`) | "Ao confirmar, o valor será liberado ao recebedor." |

### Fluxo de contestação formal no app

1. Acordo `FUNDS_HELD` + não encerrado → botão **"Contestar"** aparece
2. Formulário inline: **motivo** + **descrição objetiva**
3. Aviso antes do envio: "Quando uma contestação é aberta, o valor fica travado até resolução administrativa."
4. `POST /agreements/:id/dispute` → acordo entra em `DISPUTED`
5. Botão de ações substituído por card "Em contestação — Valor travado até decisão administrativa."
6. Seção **"Contestação"** exibe: status, quem abriu, data, motivo, descrição, histórico formal
7. Botão **"Adicionar evidência"** disponível enquanto contestação está `OPEN`
8. Evidências são registros formais para análise — **não é chat**
9. Decisão administrativa exibida como **card de resolução** com justificativa e status final

### O que NÃO é contestação no Selo

- Não é chat entre as partes
- Não há troca livre de mensagens
- Não há botão "responder"
- Não há feed conversacional
- Os registros são formais, unidirecionais, para análise administrativa
- O backend usa internamente o endpoint `/messages` por compatibilidade — no app, chamado de "evidência"

### Endpoints consumidos (Fase 11)

| Método | Rota | Onde |
|---|---|---|
| POST | `/api/v1/agreements/:id/payment-intents` | Card "Pagar com Pix" |
| POST | `/api/v1/payments/:id/simulate-confirmation` | Botão "Simular pagamento confirmado" |
| GET | `/api/v1/disputes/:id` | Carregado automaticamente se dispute existe |
| POST | `/api/v1/agreements/:id/dispute` | Formulário de contestação |
| POST | `/api/v1/disputes/:id/messages` | Envio de evidência (tratado como registro formal) |

### Limitações desta fase (Fase 11)

| Limitação | Quando resolve |
|---|---|
| Reembolso pelo app (botão refund) | Fase 12 |
| Refresh automático do JWT (401 → refresh) | Fase 12 |
| Notificações push | Fase 12 |
| Edição de perfil, avatar, chave, destino pelo app | Fase 12 |
| Animações entre telas | Fase 12 |
| Upload de arquivo como evidência | Fase 12 |
| Painel admin mobile | Fora do escopo |

### Arquivos criados/alterados — Fase 11

| Arquivo | Ação |
|---|---|
| `apps/mobile/src/types/api.ts` | Adicionado 6 novos tipos |
| `apps/mobile/src/services/agreements.service.ts` | Adicionado `createPaymentIntent`, `openDispute`, `getDispute` |
| `apps/mobile/src/services/payments.service.ts` | Criado (`simulateConfirmation`) |
| `apps/mobile/src/services/disputes.service.ts` | Criado (`getById`, `addEvidence`) |
| `apps/mobile/app/agreement/[id].tsx` | Reescrito — Fase 11 completa |

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
| `apps/mobile/app/(app)/create.tsx` | Criado (placeholder → Fase 9) / Atualizado (navegação real → Fase 10) |
| `apps/mobile/app/(app)/profile.tsx` | Reescrito (perfil completo) |

### Arquivos implementados/alterados — Fase 10

| Arquivo | Ação |
|---|---|
| `apps/mobile/src/types/api.ts` | Adicionado `ResolveKeyResponse`, `AgreementDetail`, `CreateSimpleAgreementPayload`, `CreateGuaranteedAgreementPayload` |
| `apps/mobile/src/services/receiving-keys.service.ts` | Adicionado `resolve()` |
| `apps/mobile/src/services/agreements.service.ts` | Adicionado `createSimple`, `createGuaranteed`; `getById` retorna `AgreementDetail` |
| `apps/mobile/src/components/StepHeader.tsx` | Criado |
| `apps/mobile/src/components/ReceiverPreviewCard.tsx` | Criado |
| `apps/mobile/src/components/index.ts` | Atualizado (novos exports) |
| `apps/mobile/app/create-agreement.tsx` | Criado (wizard de criação, 5 etapas) |
| `apps/mobile/app/agreement/[id].tsx` | Criado (detalhe + ações contextuais) |
| `apps/mobile/app/(app)/create.tsx` | Atualizado (navega para wizard, remove Alert placeholder) |
| `apps/mobile/app/_layout.tsx` | Atualizado (registra `create-agreement` e `agreement/[id]` no Stack) |

---

## Fase 12 — Perfil, Chave de Recebimento e Destino de Recebimento (Implementado)

### Telas criadas/alteradas

| Tela | Arquivo | O que mudou |
|---|---|---|
| Perfil completo | `app/(app)/profile.tsx` | Reescrita completa — hub de gerenciamento de perfil, chave e destinos |
| Editar perfil | `app/edit-profile.tsx` | Nova tela — formulário completo de edição de dados básicos |

### Novos serviços

| Serviço | Arquivo | Métodos |
|---|---|---|
| `usersService` | `src/services/users.service.ts` | `updateProfile(payload)` → `PATCH /users/me/profile` |

### Métodos adicionados a serviços existentes

| Serviço | Método | Endpoint |
|---|---|---|
| `receivingKeysService` | `deleteMe()` | `DELETE /receiving-keys/me` |

### Tela Perfil — seções

| Seção | O que exibe |
|---|---|
| Avatar + header | Avatar com iniciais, nome exibido, e-mail, cidade, badge de score, botão "Editar" |
| Score de confiança | Pontuação, nível colorido, texto explicativo humano |
| Minha Chave de Recebimento | Chave ativa com copy/share/excluir; ou formulário de criação com verificação de disponibilidade |
| Destino de Recebimento | Lista mascarada com edit inline/delete; formulário de cadastro de novo destino |
| Conta | "Editar perfil" (→ edit-profile) + "Sair da conta" |

### Tela Editar Perfil — campos

| Campo | Backend | Observação |
|---|---|---|
| Nome | `firstName` | Obrigatório |
| Sobrenome | `lastName` | Opcional |
| Nome exibido | `displayName` | Aparece como nome principal se preenchido |
| Bio | `bio` | Linha sobre o usuário |

> Cidade, estado, país não são editáveis via `PATCH /users/me/profile` (não estão no DTO do backend).

### Fluxo de Chave de Recebimento no app

1. Se chave ativa: exibe `@handle`, status, botões Copiar / Compartilhar / Excluir
2. Copiar → `Alert.alert` com o handle para o usuário copiar manualmente
3. Compartilhar → `Share.share` nativo
4. Excluir → confirmação via `Alert.alert` → `DELETE /receiving-keys/me` → reload
5. Se não tem chave: estado vazio + "Criar minha chave" → formulário inline
6. Formulário: input de handle (só letras/números/ponto/underline/hífen), botão "Verificar" → `GET /receiving-keys/check/:key` → indica disponível/indisponível
7. Criar → `POST /receiving-keys` → reload

### Fluxo de Destino de Recebimento no app

1. Lista destinos (tipo badge, masked, label, badge "Padrão")
2. Por destino: [Definir padrão] [Editar] [Excluir]
3. "Editar" → formulário inline com campo label + toggle isDefault → `PATCH /receiving-destinations/:id`
4. "Excluir" → confirmação → `DELETE /receiving-destinations/:id` → 409 se há pendências → mensagem amigável
5. "Adicionar destino" → formulário inline com type picker (chips), pixKey, label, isDefault toggle
6. Criação → `POST /receiving-destinations` → reload

### Endpoints consumidos (Fase 12)

| Método | Rota | Onde |
|---|---|---|
| GET | `/api/v1/auth/me` | Perfil (via useProfile) e edit-profile (load inicial) |
| PATCH | `/api/v1/users/me/profile` | Tela "Editar perfil" |
| GET | `/api/v1/receiving-keys/me` | Perfil (via useProfile) |
| POST | `/api/v1/receiving-keys` | Formulário de criação de chave |
| GET | `/api/v1/receiving-keys/check/:key` | Verificação de disponibilidade |
| DELETE | `/api/v1/receiving-keys/me` | Botão "Excluir" na chave |
| GET | `/api/v1/receiving-destinations/me` | Perfil (via useProfile) |
| POST | `/api/v1/receiving-destinations` | Formulário de novo destino |
| PATCH | `/api/v1/receiving-destinations/:id` | Edit inline de destino |
| DELETE | `/api/v1/receiving-destinations/:id` | Exclusão de destino |

### Terminologia no app (Fase 12)

| Técnico/Backend | App para o usuário |
|---|---|
| `ReceivingKey` | Chave de Recebimento |
| `handle` | chave (no contexto da Chave de Recebimento) |
| `ReceivingDestination` | Destino de Recebimento |
| `pixKey` | valor da chave (nunca exposto ao usuário — só `maskedValue`) |
| `PIX_CPF` | CPF |
| `PIX_EMAIL` | E-mail |
| `PIX_PHONE` | Telefone |
| `PIX_RANDOM` | Aleatória |
| `isDefault` | Padrão |

> A Chave de Recebimento **não é chave Pix**. Serve para localizar o usuário dentro do app.
> O Destino de Recebimento é simulado em dev. Nenhum dado é validado com o Banco Central. Nenhum dinheiro real é movimentado.

### Limitações desta fase (Fase 12)

| Limitação | Quando resolve |
|---|---|
| Refresh automático do JWT (401 → refresh → retry) | Fase 13 |
| Upload de avatar | Fase 13 |
| Notificações push | Fase 13 |
| Botão "Reembolsar" no app | Fase 13 |
| Validação de pixKey com o Banco Central | Produção (Fitbank) |
| Criptografia do pixKey em armazenamento | Produção (KMS) |
