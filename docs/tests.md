# Testes Automatizados — Selo API (Fase 17)

## Objetivo

Proteger o núcleo do MVP contra regressões com uma base inicial de testes unitários automáticos.

Esta fase não adicionou funcionalidade financeira real, não alterou regras de negócio, não alterou o banco de dados e não movimentou dinheiro real. O objetivo exclusivo foi segurança técnica por cobertura de testes.

---

## Como Rodar

```bash
# Testes unitários do backend
pnpm --filter @selo/api test

# Testes com cobertura
pnpm --filter @selo/api test:cov

# Testes em modo watch (desenvolvimento)
pnpm --filter @selo/api test:watch

# Validações de tipo (Mobile e Admin)
pnpm --filter @selo/mobile typecheck
pnpm --filter @selo/admin typecheck

# Build do backend (sem regressão de compilação)
pnpm --filter @selo/api build
```

---

## Estratégia

### Tipo de testes: Unit Tests com Mock de Prisma

Os testes unitários usam mocks do `PrismaService` via `jest.fn()` em vez de um banco real. Isso garante:

- **Velocidade**: toda a suíte roda em ~7 segundos
- **Isolamento**: cada teste controla exatamente o que o banco "responde"
- **Sem efeito colateral**: nenhuma migration, nenhum dado real criado
- **Compatibilidade**: usa Jest + ts-jest conforme já configurado no `package.json` do `apps/api`

### Framework

| Ferramenta | Versão | Uso |
|---|---|---|
| Jest | 29.x | Runner de testes |
| ts-jest | 29.x | Compilação TypeScript no teste |
| @nestjs/testing | 10.x | `Test.createTestingModule()` |

### Estrutura

```
apps/api/src/
├── test/
│   └── helpers/
│       └── factories.ts          ← Factories de dados de teste + mock do Prisma (incl. makeAdminUser)
├── modules/
│   ├── admin/
│   │   ├── admin-auth.service.spec.ts  ← Fase 17: login, getMe, logout admin
│   │   └── admin.service.spec.ts
│   ├── auth/
│   │   └── auth.service.spec.ts
│   ├── receiving-keys/
│   │   └── receiving-keys.service.spec.ts
│   ├── receiving-destinations/
│   │   └── receiving-destinations.service.spec.ts
│   ├── agreements/
│   │   └── agreements.service.spec.ts
│   ├── payments/
│   │   └── payments.service.spec.ts
│   ├── disputes/
│   │   └── disputes.service.spec.ts
│   ├── admin/
│   │   └── admin.service.spec.ts
│   ├── notifications/
│   │   └── notifications.service.spec.ts
│   └── trust-score/
│       └── trust-score.service.spec.ts
```

---

## Resultado da Suíte

```
Test Suites: 10 passed, 10 total
Tests:       155 passed, 155 total
Snapshots:   0 total
Time:        ~15s
```

---

## Cobertura por Módulo

### Auth Admin — AdminAuthService (13 testes) — Fase 17

| Cenário | Coberto |
|---|---|
| Login com credenciais válidas → accessToken | ✅ |
| JWT assinado com payload type=admin | ✅ |
| Email normalizado para lowercase antes de buscar | ✅ |
| Login com admin inexistente → UnauthorizedException | ✅ |
| Login com senha incorreta → UnauthorizedException | ✅ |
| Login com admin SUSPENDED → UnauthorizedException | ✅ |
| Login com admin DELETED → UnauthorizedException | ✅ |
| lastLoginAt atualizado após login bem-sucedido | ✅ |
| Mensagem de erro genérica (timing-safe — mesma msg para inexistente e senha errada) | ✅ |
| getMe retorna dados sem passwordHash | ✅ |
| getMe → NotFoundException para admin inexistente | ✅ |
| getMe retorna lastLoginAt quando preenchido | ✅ |
| logout retorna mensagem de confirmação | ✅ |

---

### Auth (25 testes)

| Cenário | Coberto |
|---|---|
| Registro com email novo | ✅ |
| Normalização de email para lowercase | ✅ |
| Registro com email duplicado → ConflictException | ✅ |
| Login com credenciais válidas | ✅ |
| Login com usuário inexistente | ✅ |
| Login com senha incorreta | ✅ |
| Login com conta inativa (BLOCKED) | ✅ |
| Resposta nunca expõe passwordHash | ✅ |
| Refresh com token válido → novo accessToken | ✅ |
| Refresh com token inválido | ✅ |
| Refresh com sessão revogada | ✅ |
| Refresh com sessão expirada | ✅ |
| Refresh detectando reutilização de token → revogar | ✅ |
| Refresh com sessão inexistente | ✅ |
| Logout revoga sessão | ✅ |
| Logout com sessionId undefined não falha | ✅ |
| getMe retorna usuário com perfil e score | ✅ |
| getMe com userId inexistente → NotFoundException | ✅ |

---

### Chave de Recebimento do App (21 testes)

| Cenário | Coberto |
|---|---|
| Criar chave válida | ✅ |
| Normalizar handle com @ e maiúsculas | ✅ |
| Bloquear criação quando já há chave ativa | ✅ |
| Bloquear handle já em uso por outro usuário | ✅ |
| Bloquear handle muito curto (<3 chars) | ✅ |
| Bloquear handle muito longo (>30 chars) | ✅ |
| Bloquear handle com caracteres inválidos | ✅ |
| Bloquear handles reservados (admin, selo, api) | ✅ |
| Buscar chave ativa | ✅ |
| NotFoundException quando não há chave ativa | ✅ |
| checkAvailability: disponível | ✅ |
| checkAvailability: em uso | ✅ |
| checkAvailability: reservado | ✅ |
| checkAvailability: formato inválido | ✅ |
| resolve: retorna dados públicos para chave ativa | ✅ |
| resolve: NotFoundException para chave inexistente | ✅ |
| resolve: NotFoundException para chave deletada | ✅ |
| remove: soft delete sem pendências | ✅ |
| remove: NotFoundException sem chave ativa | ✅ |
| remove: bloqueado por acordo ativo | ✅ |
| remove: bloqueado por disputa aberta | ✅ |

---

### Destino de Recebimento (18 testes)

| Cenário | Coberto |
|---|---|
| maskValue para CPF | ✅ |
| maskValue para email | ✅ |
| maskValue para telefone | ✅ |
| maskValue para chave aleatória | ✅ |
| maskValue para CNPJ | ✅ |
| Criar destino (sem expor keyValue) | ✅ |
| Primeiro destino vira padrão automaticamente | ✅ |
| isDefault=true promove e demove o anterior | ✅ |
| findAllByUser retorna lista mascarada | ✅ |
| findAllByUser retorna vazio | ✅ |
| findAnyActive retorna null quando não há ativo | ✅ |
| findAnyActive retorna destino quando existe | ✅ |
| update: atualiza label | ✅ |
| update: NotFoundException para inexistente | ✅ |
| update: ForbiddenException para outro usuário | ✅ |
| remove: soft delete sem pendências | ✅ |
| remove: NotFoundException para inexistente | ✅ |
| remove: ForbiddenException para outro usuário | ✅ |
| remove: ConflictException por acordo bloqueante | ✅ |

---

### Acordos Simples e com Garantia (30 testes)

| Cenário | Coberto |
|---|---|
| Criar acordo simples | ✅ |
| Bloquear acordo consigo mesmo | ✅ |
| NotFoundException para contraparte inexistente | ✅ |
| NotFoundException para chave da contraparte inativa | ✅ |
| BadRequest ao criar garantia sem destino ativo do recebedor | ✅ |
| BadRequest ao criar garantia consigo mesmo | ✅ |
| Criar acordo com garantia com destino ativo | ✅ |
| Contraparte aceita acordo → ACTIVE | ✅ |
| ForbiddenException: criador não pode aceitar | ✅ |
| BadRequest: aceitar acordo fora de AWAITING_ACCEPTANCE | ✅ |
| Contraparte recusa acordo → CANCELLED | ✅ |
| ForbiddenException: criador não pode recusar | ✅ |
| Criador cancela acordo em AWAITING_ACCEPTANCE | ✅ |
| ForbiddenException: contraparte não pode cancelar sem aceitar | ✅ |
| BadRequest: cancelar acordo já cancelado | ✅ |
| BadRequest: cancelar com valor protegido | ✅ |
| Concluir acordo simples ACTIVE | ✅ |
| BadRequest: concluir acordo com garantia via /complete | ✅ |
| BadRequest: concluir acordo já concluído | ✅ |
| Abrir disputa → DISPUTED + FROZEN_DISPUTE | ✅ |
| BadRequest: abrir disputa em acordo simples | ✅ |
| BadRequest: abrir disputa sem FUNDS_HELD | ✅ |
| ConflictException: já existe disputa | ✅ |
| ForbiddenException: não participante na disputa | ✅ |
| release: ConflictException com disputa aberta | ✅ |
| release: BadRequest sem FUNDS_HELD | ✅ |
| release: BadRequest em acordo simples | ✅ |
| confirmCompletion: ConflictException com disputa aberta | ✅ |
| confirmCompletion: BadRequest em acordo simples | ✅ |
| confirmCompletion: ConflictException em confirmação duplicada | ✅ |

---

### Pagamento Pix Simulado (6 testes)

| Cenário | Coberto |
|---|---|
| Confirmar pagamento simulado → guarantee LOCKED | ✅ |
| NotFoundException: PaymentIntent inexistente | ✅ |
| ForbiddenException: não participante | ✅ |
| ConflictException: pagamento já confirmado | ✅ |
| BadRequest: pagamento em estado não confirmável | ✅ |
| BadRequest: sem garantia associada | ✅ |

---

### Disputa Formal (8 testes)

| Cenário | Coberto |
|---|---|
| findOne: retorna disputa para participante | ✅ |
| findOne: NotFoundException para inexistente | ✅ |
| findOne: ForbiddenException para não participante | ✅ |
| findOne: não expõe dados do acordo (omitido) | ✅ |
| addMessage: adiciona evidência formal | ✅ |
| addMessage: tipo TEXT como padrão | ✅ |
| addMessage: NotFoundException para inexistente | ✅ |
| addMessage: ForbiddenException para não participante | ✅ |
| addMessage: BadRequest para disputa CLOSED | ✅ |
| addMessage: BadRequest para disputa WITHDRAWN | ✅ |

---

### Resolução Admin (18 testes)

| Cenário | Coberto |
|---|---|
| getStats retorna contadores | ✅ |
| listDisputes sem filtro | ✅ |
| listDisputes filtrando por status OPEN | ✅ |
| listDisputes retorna vazio | ✅ |
| getDispute: retorna detalhe completo | ✅ |
| getDispute: NotFoundException para inexistente | ✅ |
| resolveRelease: libera valor ao recebedor | ✅ |
| resolveRelease: NotFoundException para inexistente | ✅ |
| resolveRelease: BadRequest para disputa não OPEN | ✅ |
| resolveRelease: BadRequest para garantia não FROZEN_DISPUTE | ✅ |
| resolveRelease: atualiza trust score de vencedor e perdedor | ✅ |
| resolveRefund: reembolsa pagador | ✅ |
| resolveRefund: NotFoundException para inexistente | ✅ |
| resolveRefund: BadRequest para disputa já resolvida | ✅ |
| resolveRefund: notifica participantes | ✅ |

---

### Notificações In-App (14 testes)

| Cenário | Coberto |
|---|---|
| send: cria notificação | ✅ |
| findAllByUser: retorna paginado | ✅ |
| findAllByUser: filtra não lidas | ✅ |
| findAllByUser: retorna vazio | ✅ |
| getUnreadCount: conta não lidas | ✅ |
| getUnreadCount: retorna 0 | ✅ |
| markRead: marca como lida | ✅ |
| markRead: NotFoundException para inexistente | ✅ |
| markRead: ForbiddenException para outro usuário | ✅ |
| markAllRead: marca todas | ✅ |
| markAllRead: não falha com 0 | ✅ |

---

### Score de Confiança (12 testes)

| Cenário | Coberto |
|---|---|
| findByUser: retorna score | ✅ |
| findByUser: NotFoundException | ✅ |
| AGREEMENT_COMPLETED: +20 | ✅ |
| AGREEMENT_CANCELLED_BY_USER: -10 | ✅ |
| DISPUTE_WON: +30 | ✅ |
| DISPUTE_LOST: -50 | ✅ |
| DISPUTE_OPENED: delta 0 | ✅ |
| Score não cai abaixo de 0 | ✅ |
| Score não ultrapassa 1000 | ✅ |
| Nível recalculado com novo score | ✅ |
| Não falha quando TrustScore não existe | ✅ |
| Cria TrustScoreEvent imutável | ✅ |

---

## O Que Ficou Fora (Limitações desta fase)

| Fora do escopo | Motivo |
|---|---|
| Testes E2E com banco real | Exige Docker ativo + migrations rodando — seguro para fase futura |
| Testes do Mobile (Jest/React Native) | Mobile não tem Jest configurado; exigiria Babel + env Expo — próxima fase |
| Testes do Painel Admin (Next.js) | Admin não tem Jest configurado; não há lógica de negócio complexa nos services |
| Testes do `AgreementsService.getSummary` | Lógica in-memory com muita computação — candidato a testes de integração futuros |
| Cobertura de `refund()` e `release()` (caminho feliz) | Caminhos de sucesso dependem de múltiplas queries encadeadas — cobertura negativa priorizada |
| Testes do `FinancialGuaranteesService` | É um stub — sem lógica a testar |
| Testes do `BlockchainRecordsService` | Stub com `NotImplementedException` — sem lógica |
| Testes de perfil (UsersService/ProfilesService) | Baixo risco de regressão — CRUD simples |

---

## Próximos Passos Recomendados

1. **Testes E2E** — com banco PostgreSQL real via Docker, usando `@nestjs/testing` + seed de dados
2. **Cobertura dos caminhos felizes de release/refund** — atualmente cobertos em manuais
3. **Configurar Jest no Mobile** — `jest-expo` + mocks de `expo-secure-store`
4. **CI automatizado** — rodar `pnpm --filter @selo/api test` em pull requests (GitHub Actions)
5. **Threshold de cobertura** — definir `coverageThreshold` no jest config após estabilizar

---

## Segurança das Regras

Esta fase **não implementou**:

- Fitbank / Pix real
- Blockchain real
- KYC
- Push notifications reais
- Chat entre usuários
- Alteração de regras financeiras
- Alteração do schema Prisma
- Migration
- Commit
- Movimentação de dinheiro real

O objetivo foi exclusivamente proteger o comportamento atual do MVP contra regressões futuras.
