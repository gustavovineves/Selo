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
│   ├── help.tsx               # Central de Ajuda / FAQ (Fase 27)
│   ├── settings.tsx           # Configurações + ajuda + beta
│   ├── financial-verification.tsx  # Verificação financeira (KYC simulado)
│   ├── search.tsx             # Busca de usuários e acordos
│   ├── trust-score.tsx        # Detalhe do score de confiança
│   ├── edit-profile.tsx       # Edição de perfil
│   ├── (auth)/
│   │   ├── _layout.tsx        # Stack sem header
│   │   ├── login.tsx          # Tela de login
│   │   └── register.tsx       # Tela de cadastro (sem CPF)
│   ├── (onboarding)/
│   │   ├── welcome.tsx        # Tela de boas-vindas
│   │   ├── setup-key.tsx      # Setup da Chave de Recebimento
│   │   └── tutorial.tsx       # Tutorial de 5 slides com indicador de progresso (Fase 27)
│   ├── (app)/
│   │   ├── _layout.tsx        # Bottom Tabs com botão Criar flutuante
│   │   ├── home.tsx           # Home Wallet + banner de beta (Fase 27)
│   │   ├── agreements.tsx     # Lista de combinados com filtros
│   │   ├── create.tsx         # Criar combinado
│   │   ├── notifications.tsx  # Central de notificações
│   │   └── profile.tsx        # Perfil + modal de feedback beta (Fase 27)
│   └── agreement/
│       └── [id].tsx           # Detalhe do acordo + provas
├── src/
│   ├── theme/
│   │   └── index.ts           # Cores, espaçamentos, bordas, sombras, tipografia
│   ├── types/
│   │   ├── api.ts             # Tipos de resposta da API
│   │   └── navigation.ts      # Parâmetros de navegação
│   ├── services/
│   │   ├── api.ts             # Cliente HTTP base
│   │   ├── auth.service.ts
│   │   ├── agreements.service.ts  # inclui getProofs()
│   │   ├── wallet.service.ts
│   │   ├── receiving-keys.service.ts
│   │   ├── receiving-destinations.service.ts
│   │   ├── users.service.ts
│   │   ├── payments.service.ts
│   │   ├── disputes.service.ts
│   │   └── feedback.service.ts    # Feedback beta simulado (Fase 27)
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useAuthState.ts
│   │   ├── useAgreements.ts
│   │   ├── useSummary.ts
│   │   └── useProfile.ts
│   └── components/
│       ├── index.ts
│       ├── StatusBadge.tsx
│       ├── AgreementCard.tsx
│       ├── EmptyState.tsx
│       ├── LoadingState.tsx
│       ├── PrimaryButton.tsx
│       ├── FinancialCard.tsx
│       └── SectionHeader.tsx
├── expo-env.d.ts
└── package.json
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
4. **Prazo** — chips: 7 dias / 30 dias / Personalizado (DD/MM/AAAA) — **Sem prazo removido na Fase 18** (dueDate agora obrigatório)
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
| Refresh automático do JWT (401 → refresh → retry) | Fase 13 ✅ |
| Upload de avatar | Fase 14 |
| Notificações push | Fase 14 |
| Botão "Reembolsar" no app | Fase 14 |
| Validação de pixKey com o Banco Central | Produção (Fitbank) |
| Criptografia do pixKey em armazenamento | Produção (KMS) |

---

## Fase 13 — Infraestrutura Mobile de Sessão, Refresh JWT e Tratamento Global de Erros (Implementado)

### Objetivo

Estabilizar a base mobile de sessão e erros. Sem nova regra de negócio financeira — foco em fazer o app sobreviver à expiração do token sem quebrar a experiência do usuário.

### O que foi implementado

- **Interceptor de refresh automático no `api.ts`**: quando qualquer requisição retorna 401, o cliente HTTP tenta automaticamente `POST /auth/refresh` com o `refreshToken` do SecureStore, salva o novo `accessToken` e repete a requisição original — sem interromper o usuário.
- **Proteção contra múltiplos refresh simultâneos**: `refreshInFlight` é uma Promise compartilhada — se várias requisições falham com 401 ao mesmo tempo, apenas um refresh é disparado; as demais aguardam o resultado.
- **Proteção contra loop infinito**: rotas de autenticação (`/auth/refresh`, `/auth/login`, `/auth/register`) nunca disparam novo refresh ao receber 401 — verificado por `isAuthPath()`.
- **Logout automático quando refresh falha**: se `POST /auth/refresh` retornar erro (token expirado ou revogado), os tokens são limpos do SecureStore e o `onSessionExpired` callback é chamado.
- **Handler de sessão expirada no root layout**: `app/_layout.tsx` registra um callback via `registerSessionExpiredHandler()` que exibe `Alert.alert` com a mensagem "Sua sessão expirou. Entre novamente para continuar." e redireciona para `/(auth)/login` ao confirmar.
- **Utilitário centralizado de erros** (`src/utils/errors.ts`): `mapError(e)` converte qualquer erro em mensagem humana em português; `isSessionExpired(e)` detecta erros de sessão expirada.
- **Retry na tela Combinados**: botão "Tentar novamente" exibido quando a lista falha ao carregar; pull-to-refresh (swipe down) adicionado ao `FlatList`.

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `apps/mobile/src/utils/errors.ts` | `mapError(e)` — mensagens humanas por código HTTP; `isSessionExpired(e)` — detecta sessão expirada |

### Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `apps/mobile/src/services/api.ts` | Interceptor de 401 → refresh automático → retry; `registerSessionExpiredHandler()`; `clearTokens()`; `refreshInFlight` para evitar refreshes paralelos |
| `apps/mobile/app/_layout.tsx` | Registra `registerSessionExpiredHandler` no `useEffect`; exibe Alert e redireciona para login quando sessão expira definitivamente |
| `apps/mobile/app/(app)/agreements.tsx` | Botão "Tentar novamente" no estado de erro; `RefreshControl` (pull-to-refresh) no `FlatList`; usa `mapError` para mensagens amigáveis |

### Fluxo de refresh automático

```
Requisição qualquer (ex: GET /agreements)
  → 401 recebido
  → isRetry? NÃO | isAuthPath? NÃO
  → attemptTokenRefresh()
      → refreshToken existe no SecureStore?
          SIM → POST /auth/refresh
                  OK → salva novo accessToken → repete requisição → ✅ transparente para o usuário
                  Falha → return false
          NÃO → return false
  → refresh retornou false?
      → clearTokens()
      → onSessionExpired?.() → Alert → router.replace('/(auth)/login')
      → throw Error('SESSION_EXPIRED')
```

### Mensagens padronizadas por código HTTP (mapError)

| Código / Cenário | Mensagem exibida |
|---|---|
| `SESSION_EXPIRED` / 401 | "Sua sessão expirou. Entre novamente para continuar." |
| 400 | Mensagem específica do backend ou "Dados inválidos. Verifique as informações e tente novamente." |
| 403 | "Você não tem permissão para fazer isso." |
| 404 | "Não encontramos esse registro." |
| 409 | Mensagem específica do backend ou "Essa ação não está disponível no estado atual do combinado." |
| 500 | "Tente novamente em alguns instantes." |
| Erro de rede | "Não foi possível conectar ao Selo agora." |
| Outros | Mensagem do backend ou "Algo deu errado. Tente novamente." |

### Telas impactadas

| Tela | Impacto |
|---|---|
| Todas as telas autenticadas | Refresh automático de JWT — nenhuma mudança visual |
| Qualquer tela com 401 não resolvível | Alert "Sessão expirada" + redirect para login (via root layout) |
| Lista de Combinados | Botão retry + pull-to-refresh |
| Home Wallet | Já tinha retry — sem alteração |
| Perfil | Já tinha RefreshControl — sem alteração |
| Detalhe do acordo | Já tratava 401 — agora com refresh automático transparente |

### Endpoints consumidos

| Método | Rota | Quando |
|---|---|---|
| POST | `/api/v1/auth/refresh` | Automaticamente quando qualquer requisição recebe 401 |

### Decisões desta fase

- **`registerSessionExpiredHandler` em vez de contexto global**: mais simples, sem Provider extra; o root layout é o lugar certo para interceptar eventos globais de sessão.
- **Promise compartilhada `refreshInFlight`**: impede que múltiplas requisições simultâneas com 401 disparem múltiplos `POST /auth/refresh`. O segundo a terceiro pedido aguardam o mesmo refresh.
- **`isAuthPath` impede loop**: rotas de auth não disparam refresh para evitar `POST /refresh → 401 → POST /refresh → ...`.
- **`isRetry = true` impede double retry**: se a requisição repetida após refresh ainda retornar 401, o erro é lançado diretamente sem novo ciclo.
- **`mapError` recebe `unknown`**: cobre tanto erros lançados pelo `api.ts` (com `.status`) quanto strings de erro dos hooks (convertidas via `new Error(msg)`).
- **Sem alteração de regras financeiras**: nenhuma lógica de acordo, garantia, disputa, payout ou refund foi alterada.
- **Sem migration**: schema Prisma não foi alterado.
- **Sem commit**: conforme instrução.

### Limitações desta fase (Fase 13)

| Limitação | Quando resolve |
|---|---|
| Upload de avatar de perfil | Fase 14 |
| Notificações in-app (central de atividades) | Fase 14 ✅ |
| Botão "Reembolsar" no app mobile | Fora do escopo do usuário |
| Validação de pixKey com Banco Central | Produção (Fitbank) |
| Animações entre telas | Futuro |

---

## Fase 14 — Notificações In-App e Central de Atividades (Implementado)

### Objetivo

Criar uma central de notificações dentro do app para avisar o usuário sobre eventos importantes dos combinados. Sem push notification real — notificações são apenas in-app.

### O que foi implementado

**Backend:**
- `NotificationsService` aprimorado: `findAllByUser` com paginação, filtros por status/tipo; `getUnreadCount`
- `NotificationsController` expandido: `GET /unread-count`, filtros de query (`read`, `type`, `page`, `limit`), suporte a `POST` além de `PATCH` para `/:id/read` e `/read-all`
- Geração automática de notificações em `AgreementsService`: acordo recebido, aceito, recusado, cancelado, concluído, aguardando confirmação, valor protegido (dupla confirmação), liberação, reembolso, contestação aberta
- Geração em `PaymentsService`: valor protegido (`FUNDS_LOCKED`) após `simulate-confirmation`
- Geração em `AdminService`: contestação resolvida — liberação e reembolso — com notificações para ambos os participantes

**Mobile:**
- `src/services/notifications.service.ts` — `list`, `getUnreadCount`, `markAsRead`, `markAllAsRead` + listener module-level para badge
- `src/types/api.ts` — `AppNotification`, `NotificationType`, `NotificationStatus`, `NotificationListResponse`, `UnreadCountResponse`
- `app/(app)/notifications.tsx` — tela "Atividades" completa
- `app/(app)/_layout.tsx` — nova aba "Atividades" com badge de não lidas (posição simétrica: Home | Combinados | [+] | Atividades | Perfil)

### Tela Atividades (notifications.tsx)

| Elemento | Descrição |
|---|---|
| Barra de ações | Contador de atividades + não lidas; botão "Marcar todas como lidas" |
| Lista de notificações | FlatList com pull-to-refresh e separadores |
| Item de notificação | Ícone colorido por tipo, título, corpo, data relativa, ponto de não lida |
| Estado vazio | EmptyState com ícone de sino desativado e mensagem explicativa |
| Estado de erro | EmptyState + botão "Tentar novamente" |
| Ação no item | Marca como lida + navega para o acordo relacionado (se houver `agreementId`) |
| Pull-to-refresh | RefreshControl com `useFocusEffect` — recarrega ao focar a aba |

### Ícones e cores por tipo de notificação

| Tipo | Ícone | Cor | Texto humano |
|---|---|---|---|
| AGREEMENT_RECEIVED | document-text-outline | Primary | Combinado recebido |
| AGREEMENT_ACCEPTED | checkmark-circle-outline | Accent (verde) | Aceito |
| AGREEMENT_REJECTED | close-circle-outline | Danger (vermelho) | Recusado |
| AGREEMENT_COMPLETED | ribbon-outline | Accent | Concluído |
| AGREEMENT_CANCELLED | ban-outline | TextMuted | Cancelado |
| FUNDS_LOCKED | lock-closed-outline | Primary | Valor protegido |
| PAYOUT_SENT | arrow-up-circle-outline | Accent | Liberado |
| REFUND_PROCESSED | return-down-back-outline | Warning | Reembolso |
| DISPUTE_OPENED | alert-circle-outline | Danger | Contestação |
| DISPUTE_RESOLVED | checkmark-done-outline | Primary | Análise concluída |
| SYSTEM_ALERT | information-circle-outline | TextMuted | Aviso |

### Geração de notificações por evento

| Evento | Quem recebe | Tipo | Título |
|---|---|---|---|
| Acordo simples criado | Contraparte | AGREEMENT_RECEIVED | "Você recebeu um combinado" |
| Acordo c/ garantia criado | Contraparte | AGREEMENT_RECEIVED | "Você recebeu um combinado com valor protegido" |
| Acordo aceito | Criador | AGREEMENT_ACCEPTED | "Combinado aceito" |
| Acordo recusado | Criador | AGREEMENT_REJECTED | "Combinado recusado" |
| Acordo cancelado | Outros participantes | AGREEMENT_CANCELLED | "Combinado cancelado" |
| Acordo concluído (simples) | Outros participantes | AGREEMENT_COMPLETED | "Combinado concluído" |
| 1ª confirmação (dupla) | Outra parte | SYSTEM_ALERT | "Aguardando sua confirmação" |
| 2ª confirmação (payout) | Receptor | PAYOUT_SENT | "Pagamento liberado" |
| 2ª confirmação (payout) | Pagador | AGREEMENT_COMPLETED | "Combinado concluído" |
| Release manual | Receptor | PAYOUT_SENT | "Pagamento liberado" |
| Release manual | Outros | AGREEMENT_COMPLETED | "Combinado concluído" |
| Simulate-confirmation | Pagador | FUNDS_LOCKED | "Valor protegido" |
| Simulate-confirmation | Receptor | FUNDS_LOCKED | "Valor protegido" |
| Contestação aberta | Abridor | DISPUTE_OPENED | "Contestação registrada" |
| Contestação aberta | Outra parte | DISPUTE_OPENED | "Contestação aberta" |
| Reembolso (usuário) | Pagador | REFUND_PROCESSED | "Reembolso registrado" |
| Admin resolve-release | Receptor | PAYOUT_SENT | "Contestação resolvida — valor liberado" |
| Admin resolve-release | Pagador | DISPUTE_RESOLVED | "Contestação resolvida" |
| Admin resolve-refund | Pagador | REFUND_PROCESSED | "Contestação resolvida — reembolso registrado" |
| Admin resolve-refund | Receptor | DISPUTE_RESOLVED | "Contestação resolvida" |

### Endpoints criados/alterados

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/v1/notifications` | Lista notificações com filtros (`read`, `type`, `page`, `limit`, `unreadOnly`) |
| GET | `/api/v1/notifications/unread-count` | Contador de não lidas |
| POST/PATCH | `/api/v1/notifications/:id/read` | Marca uma notificação como lida |
| POST/PATCH | `/api/v1/notifications/read-all` | Marca todas como lidas |

### Badge de não lidas

- `(app)/_layout.tsx` busca `GET /notifications/unread-count` no mount
- Badge mostrado na aba "Atividades" enquanto houver notificações não lidas
- Badge atualizado automaticamente via listener module-level `notifyUnreadCountChanged()`
- Ao marcar todas como lidas em `markAllAsRead()`, o listener é chamado com `0`
- Ao abrir a tela, `useFocusEffect` recarrega a lista e atualiza o listener

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `apps/mobile/src/services/notifications.service.ts` | `list`, `getUnreadCount`, `markAsRead`, `markAllAsRead` + listener de badge |
| `apps/mobile/app/(app)/notifications.tsx` | Tela "Atividades" com lista, badge, retry, pull-to-refresh |

### Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `apps/api/src/modules/notifications/notifications.service.ts` | `findAllByUser` com paginação; `getUnreadCount`; tipagem forte com `NotificationType` |
| `apps/api/src/modules/notifications/notifications.controller.ts` | `GET /unread-count`; filtros de query; `@Post` em `/read-all` e `/:id/read` |
| `apps/api/src/modules/agreements/agreements.module.ts` | Importa `NotificationsModule` |
| `apps/api/src/modules/agreements/agreements.service.ts` | Injeta `NotificationsService`; dispara notificações em 10 eventos |
| `apps/api/src/modules/payments/payments.module.ts` | Importa `NotificationsModule` |
| `apps/api/src/modules/payments/payments.service.ts` | Injeta `NotificationsService`; dispara `FUNDS_LOCKED` |
| `apps/api/src/modules/admin/admin.module.ts` | Importa `NotificationsModule` |
| `apps/api/src/modules/admin/admin.service.ts` | Injeta `NotificationsService`; dispara `DISPUTE_RESOLVED` em resolve-release e resolve-refund |
| `apps/mobile/src/types/api.ts` | `AppNotification`, `NotificationType`, `NotificationStatus`, `NotificationListResponse`, `UnreadCountResponse` |
| `apps/mobile/app/(app)/_layout.tsx` | Aba "Atividades" com badge; listener de unread-count no mount |

### Decisões desta fase

- **Notificações são fire-and-forget**: chamadas com `.catch(() => {})` — falha na notificação não desfaz a operação principal
- **Sem push notification real**: todas as notificações são in-app apenas. Expo Notifications não foi implementada.
- **Listener module-level** em vez de Context: evita Provider extra e acoplamento React desnecessário para o caso de uso simples de badge de contador
- **`useFocusEffect`** na tela de notificações: recarrega ao focar a aba — badge sempre reflete o estado real após visitar a tela
- **Schema não foi alterado**: todos os campos do modelo `Notification` já existiam (`id`, `userId`, `type`, `status`, `title`, `body`, `data`, `readAt`, `sentAt`, `createdAt`)
- **`NotificationType` existente atendeu todos os casos**: nenhum enum novo necessário

### Limitações desta fase (Fase 14)

| Limitação | Quando resolve |
|---|---|
| Push notifications reais (Expo Notifications) | Fora do escopo do MVP mobile |
| Upload de avatar de perfil | Futuro |
| Badge não atualiza em segundo plano | Requer push notifications reais |
| Paginação infinita na lista de notificações | Futuro |
| Filtro por tipo na tela | Futuro |

---

## Fase 18 — Auditoria do Prazo Visual e Mudanças no Picker de Data

### Estado após Fase 18 (histórico)

A opção "Sem prazo" foi **removida** na Fase 18, porque `dueDate` agora é obrigatório no backend. O picker existia apenas como chips de seleção rápida (7d / 30d / Personalizado DD/MM/AAAA). O horário era definido automaticamente como `23:59:59` sem exposição ao usuário.

---

## Fase 19 — Polimento UX Mobile de Prazo: Date Picker + Time Wheel (Implementada)

### Objetivo

Substituir a etapa de prazo por uma experiência visual moderna: seleção de dia por chips + data personalizada, e seleção de horário por scroll wheel com intervalos de 30 minutos.

### Novos componentes

| Componente | Arquivo | Descrição |
|---|---|---|
| `TimeWheelPicker` | `src/components/TimeWheelPicker.tsx` | Scroll wheel de horário (00:00–23:30, 48 slots, snap cada 30min) |
| `DueDatePicker` | `src/components/DueDatePicker.tsx` | Picker combinado de dia + horário; chips rápidos + data manual + TimeWheelPicker embutido |

### Como funciona a seleção de prazo (Fase 19)

#### Seleção de dia

O usuário escolhe entre quatro chips rápidos:

| Chip | Data |
|---|---|
| Hoje | data atual |
| Amanhã | +1 dia |
| 7 dias | +7 dias |
| 30 dias | +30 dias |

Ou toca em **"Outra data"** para digitar manualmente no formato `DD/MM/AAAA`.

O chip ativo fica destacado (roxo) com a data curta embaixo (ex: `25/06`). Ao selecionar qualquer dia, um preview da data completa aparece imediatamente: `25/06/2026`.

#### Seleção de horário

Abaixo da seleção de data, o `TimeWheelPicker` exibe 48 slots de 30 em 30 minutos:

```
...
17:00
17:30
► 18:00  ← selecionado (roxo, maior, bordas de seleção)
18:30
19:00
...
```

O usuário rola verticalmente e o scroll trava (snap) a cada 30 minutos. O slot central é sempre o selecionado. Tocar diretamente num slot também o seleciona (e o scroll anima até lá).

- Padrão inicial: **18:00**
- Intervalo: 30 minutos
- Total de slots: 48 (00:00 a 23:30)

#### Preview final

Abaixo do time wheel, o componente exibe um card de confirmação:

```
⏱ Prazo: 25/06/2026 às 18:00
```

#### Construção do `dueDate`

```typescript
function buildFinalDueDate(date: Date, hour: number, minute: number): string {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
```

O dueDate é sempre montado com o dia escolhido pelo usuário + hora + minuto do time wheel.

### Etapa no wizard de criação

- **Etapa 4** passou a se chamar "Prazo e horário" (era "Prazo")
- Validação: data obrigatória + prazo não pode estar no passado
- Se o usuário não escolheu uma data, ao tentar avançar aparece: "Escolha o dia do prazo para continuar."
- Se a data/hora já passou: "O prazo precisa ser uma data e horário no futuro."
- Padrão inicial: **7 dias a partir de hoje + 18:00** — o usuário já chega na etapa com um prazo válido

### Resumo e tela de sucesso

O prazo agora é exibido com data e hora em toda a UI:

```
Prazo: 25/06/2026 às 18:00
```

Afeta:
- Etapa de resumo (Step 4 → linha "Prazo")
- Frase em linguagem humana no card de resumo (`buildSummaryText`)
- Tela de sucesso após criar o acordo

### O que NÃO foi implementado (limitações)

| Item | Status |
|---|---|
| Date Picker Wheel nativo (iOS-style, dia/mês/ano rotativo) | ⚠️ MVP: chips rápidos + campo DD/MM/AAAA. Wheel nativo exigiria `@react-native-picker/picker` ou equivalente |
| Horário em intervalos de 15 min | ⚠️ Implementado em 30 min (48 slots). Mudar para 15 min = 96 slots, apenas alterar a constante |
| Scroll infinito real (loop) no time wheel | ⚠️ O scroll não é circular/infinito — vai de 00:00 a 23:30 e para. Suficiente para o MVP |
| Seleção de horário por teclado | ⚠️ Apenas scroll/tap. Sem input manual de hora |

### Validações desta fase

| Comando | Resultado |
|---|---|
| `pnpm --filter @selo/mobile typecheck` | ✅ Exit 0 |
| `pnpm --filter @selo/api test` | ✅ 155 testes, 10 suítes, 0 falhas |
| `pnpm --filter @selo/api test:e2e` | ✅ 83 testes, 1 suíte, 0 falhas |
| `pnpm --filter @selo/api build` | ✅ Exit 0 |
| `pnpm --filter @selo/admin typecheck` | ✅ Exit 0 |

### Confirmações obrigatórias

| Restrição | Status |
|---|---|
| Schema Prisma alterado? | **Não** |
| Migration nova? | **Não** |
| Fitbank real? | **Não** |
| Pix real? | **Não** |
| Blockchain real? | **Não** |
| KYC? | **Não** |
| Push notifications reais? | **Não** |
| Chat? | **Não** |
| dueDate removido/tornado opcional? | **Não — continua obrigatório** |
| Dinheiro real movimentado? | **Não** |
| Commit feito? | **Não** |

---

## Fase 20 — Auditoria Final do MVP Simulado (Concluída)

### Bug corrigido nesta fase

| Arquivo | Bug | Correção |
|---|---|---|
| `apps/mobile/app/agreement/[id].tsx` | Linha 681: `formatDate(agreement.dueDate)` exibia apenas `"25/06/2026"` sem o horário | Adicionada `formatDateWithTime` — exibe `"25/06/2026 às 18:00"` |

O campo "Prazo" na tela de detalhe do acordo agora é coerente com o resumo do wizard de criação e com a tela de sucesso (que já exibiam data + hora desde a Fase 19).
