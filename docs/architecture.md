# Arquitetura do Selo

## Visão Geral

```
┌─────────────────────────────────────────────────────┐
│                   CLIENTES                          │
│  ┌─────────────────┐       ┌─────────────────────┐  │
│  │  Mobile (Expo)  │       │  Admin (Next.js)    │  │
│  │  React Native   │       │  Fase 4             │  │
│  └────────┬────────┘       └──────────┬──────────┘  │
└───────────┼──────────────────────────┼──────────────┘
            │  HTTP/REST               │
            ▼                          ▼
┌─────────────────────────────────────────────────────┐
│              BACKEND (NestJS)  — Port 3000          │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │               Módulos                        │   │
│  │  auth  users  profiles  agreements           │   │
│  │  payments  pix  disputes  trust-score        │   │
│  │  notifications  audit-logs  admin            │   │
│  │  blockchain-records  financial-guarantees    │   │
│  └────────────────────┬─────────────────────────┘   │
│                       │ Prisma ORM                  │
└───────────────────────┼─────────────────────────────┘
                        │
            ┌───────────▼───────────┐
            │   PostgreSQL 16       │
            │   (Docker)            │
            └───────────────────────┘

Integrações Futuras:
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │   Pix/BaaS   │  │  Blockchain  │  │   Fitbank    │
  │   (Fase 2)   │  │  (Fase 4)    │  │  (Fase 5)    │
  └──────────────┘  └──────────────┘  └──────────────┘
```

## Fluxo de Autenticação

```
1. POST /api/v1/auth/register → { accessToken, refreshToken }
2. POST /api/v1/auth/login    → { accessToken, refreshToken }
3. GET  /api/v1/auth/me       → usuário autenticado
4. POST /api/v1/auth/refresh  → novo accessToken
```

- **Access Token:** JWT, expira em 15 minutos
- **Refresh Token:** JWT, expira em 7 dias
- **Estratégia:** Passport JWT via `@nestjs/passport`
- **Armazenamento mobile:** `expo-secure-store`

## Fluxo de um Acordo Simples

```
1. Criador: POST /agreements → status: DRAFT
2. Criador envia link/email para contraparte
3. Contraparte: PATCH /agreements/:id/accept → status: ACTIVE
4. Partes realizam o combinado
5. Criador: PATCH /agreements/:id/complete → status: COMPLETED
6. TrustScore recalculado para ambas as partes
```

## Fluxo de Acordo com Garantia (Fase 2)

```
1. Criador: POST /agreements { type: WITH_GUARANTEE }
2. Criador: POST /financial-guarantees { agreementId, amount }
3. Criador: POST /payments → gera QR Code Pix
4. Contraparte paga via Pix → garantia travada
5. Acordo executado → PATCH /financial-guarantees/:id/release
6. Garantia liberada para destinatário
```

## Estrutura de Módulos NestJS

Cada módulo segue o padrão:
```
modules/{nome}/
├── {nome}.module.ts      # Imports, providers, exports
├── {nome}.controller.ts  # Endpoints HTTP
├── {nome}.service.ts     # Lógica de negócio
└── dto/                  # Data Transfer Objects (class-validator)
```

## Banco de Dados — Entidades Principais

```
User ──────────────── Profile
 │                    TrustScore
 ├── ReceivingKey
 ├── ReceivingDestination
 ├── Agreement (creator) ────── AgreementEvent
 ├── Agreement (counterpart)    FinancialGuarantee ── Payment ── PixTransaction
 ├── Dispute
 ├── Notification
 └── AuditLog
```

## Score de Confiança (Fase 3)

- **Base:** 500 pontos
- **+20** por acordo completado
- **-50** por disputa aberta
- **-100** por disputa perdida
- **Range:** 0–1000
- **Recalculado** após cada evento relevante

## Prova em Blockchain (Fase 4)

```
1. Acordo criado/aceito → gerar hash SHA256 dos termos
2. Hash publicado em smart contract (Ethereum/Polygon testnet)
3. txHash salvo em BlockchainRecord
4. Qualquer um pode verificar o hash na chain
```
