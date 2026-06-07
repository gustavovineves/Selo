# Blockchain como Prova — Fase 26

> Criado na Fase 26. Descreve a camada de prova de integridade baseada em blockchain do Selo.

---

## 1. Princípio Central

**A blockchain no Selo registra prova de integridade — não dinheiro.**

| O que a blockchain FAZ | O que a blockchain NÃO FAZ |
|---|---|
| Registra hash canônico de eventos relevantes | Guardar dinheiro |
| Prova que um evento existia em determinado momento | Tokenizar reais |
| Fornece rastreabilidade verificável | Custodiar fundos |
| Complementa o histórico interno do Selo | Substituir o parceiro financeiro |

O dinheiro do Selo permanece em reais, protegido por parceiro financeiro (Fitbank ou equivalente no fluxo futuro). A blockchain é apenas uma camada adicional de rastreabilidade.

---

## 2. Modos de Operação

| Modo | `BLOCKCHAIN_PROVIDER` | Chamada real | Comportamento |
|---|---|---|---|
| **simulated** (padrão) | `simulated` | Nunca | Gera `proofHash` e `txHash` determinístico fake. Marca `SUBMITTED`. |
| **testnet** | `testnet` | Somente se `BLOCKCHAIN_ENABLE_REAL_CALLS=true` | Prepara submissão real ao Ethereum/Polygon testnet. Se env faltar, retorna `PENDING`. |
| **testnet real** | `testnet` + `ENABLE_REAL_CALLS=true` + RPC configurado | Sim (futuro) | Submete ao testnet. TxHash real preenchido quando confirmado. |

**Padrão local e CI:** `BLOCKCHAIN_PROVIDER=simulated`, `BLOCKCHAIN_ENABLE_REAL_CALLS=false`.

---

## 3. Variáveis de Ambiente

```env
BLOCKCHAIN_PROVIDER=simulated
BLOCKCHAIN_NETWORK=polygon_amoy
BLOCKCHAIN_ENABLE_REAL_CALLS=false
BLOCKCHAIN_CONFIRMATIONS=1

# Preencher SOMENTE para testnet real (nunca commitar):
# BLOCKCHAIN_RPC_URL=
# BLOCKCHAIN_PRIVATE_KEY=     ← NUNCA commitar
# BLOCKCHAIN_CONTRACT_ADDRESS=
```

---

## 4. Eventos que Geram Prova

| Evento | `eventType` | Quando ocorre |
|---|---|---|
| Acordo simples criado | `AGREEMENT_CREATED` | `createSimple()` |
| Acordo com garantia criado | `AGREEMENT_CREATED` | `createGuaranteed()` |
| Acordo aceito pela contraparte | `AGREEMENT_ACCEPTED` | `accept()` |
| Valor liberado (payout) | `PAYOUT_COMPLETED` | `release()` |
| Liberação por dupla confirmação | `DUAL_CONFIRMATION_PAYOUT` | `confirmCompletion()` (ambos confirmaram) |
| Reembolso | `REFUND_COMPLETED` | `refund()` |
| Contestação aberta | `DISPUTE_OPENED` | `openDispute()` |
| Disputa resolvida — liberação | `DISPUTE_RESOLVED` | Admin `resolveRelease()` |
| Disputa resolvida — reembolso | `DISPUTE_RESOLVED` | Admin `resolveRefund()` |

---

## 5. Como o Hash é Gerado

```
proofHash = SHA-256(canonicalJson({ eventType, ...sanitizedPayload }))
```

**Regras:**

1. **Ordenação canônica de chaves** — garante determinismo (mesma entrada → mesmo hash).
2. **Sanitização prévia** — campos sensíveis são substituídos por `[REDACTED]` antes do hash:
   - `document` / `cpf`
   - `passwordHash`
   - `pixKey` / `normalizedKey`
   - `accessToken` / `refreshToken`
   - `secret` / campos com `token` no nome
   - `rawRequest` / `rawResponse`
   - `authorization`
3. O payload sanitizado também é armazenado em `proofData` (sem dados sensíveis).

---

## 6. Modelo `BlockchainRecord`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `cuid` | Identificador único |
| `agreementId` | `String` | FK para `Agreement` (1:N — múltiplos eventos por acordo) |
| `eventType` | `String?` | Ex: `AGREEMENT_CREATED`, `DISPUTE_OPENED` |
| `network` | `BlockchainNetwork` | `POLYGON_TESTNET`, `ETHEREUM_TESTNET`, etc. |
| `proofHash` | `String?` | SHA-256 do payload canônico sanitizado |
| `proofData` | `Json?` | Payload sanitizado que gerou o hash |
| `txHash` | `String?` | Hash da transação no testnet (null em modo simulated) |
| `status` | `BlockchainRecordStatus` | `PENDING \| SUBMITTED \| CONFIRMED \| FAILED` |
| `errorMessage` | `String?` | Mensagem de erro quando `FAILED` |
| `submittedAt` | `DateTime?` | Quando foi submetido ao provider |
| `confirmedAt` | `DateTime?` | Quando o bloco foi confirmado (testnet real) |

**Relação 1:N:** Um acordo pode ter múltiplos `BlockchainRecord`, um por evento.

---

## 7. Endpoints

### Usuário participante

```
GET /api/v1/agreements/:id/proofs
```

- Autenticado (`JwtAuthGuard`)
- Apenas participantes do acordo podem consultar
- Retorna: `eventType`, `status`, `proofHashShort`, `txHashShort`, `network`, `createdAt`, `humanMessage`
- **Não expõe:** `proofHash` completo, `proofData`, dados sensíveis

### Admin

```
GET /api/v1/admin/agreements/:id/proofs
```

- Protegido por `AdminJwtGuard`
- Retorna lista completa com `proofHash`, `txHash`, `errorMessage`, `retryCount`
- Ainda sem dados sensíveis crus

---

## 8. Arquitetura do Provider

```
IBlockchainProofProvider (interface)
├── SimulatedBlockchainProofProvider   ← padrão, sem rede
└── TestnetBlockchainProofProvider     ← stub, RPC real futuro
```

DI Token: `BLOCKCHAIN_PROOF_PROVIDER_TOKEN`

O provider é selecionado via `ConfigService` (`BLOCKCHAIN_PROVIDER`).

---

## 9. Segurança

| Garantia | Status |
|---|---|
| Private key nunca logada | ✅ |
| RPC URL não exposta em responses | ✅ |
| Payload sem CPF | ✅ (sanitizer) |
| Payload sem pixKey completa | ✅ (sanitizer) |
| Payload sem tokens/senhas | ✅ (sanitizer) |
| Blockchain não guarda dinheiro | ✅ |
| CI não depende de rede externa | ✅ |
| `BLOCKCHAIN_ENABLE_REAL_CALLS=false` por padrão | ✅ |
| Falha de blockchain não quebra fluxo financeiro | ✅ (silencioso catch) |

---

## 10. Mobile

Na tela de detalhe do acordo, a seção **"Registros de prova"** exibe:
- Evento (em linguagem humana)
- Status (registrado / pendente / confirmado / falhou)
- Hash curto
- TxHash curto (quando presente)
- Data e hora
- Aviso: *"O dinheiro não fica na blockchain."*

---

## 11. Limitações Desta Fase

| Limitação | Detalhe |
|---|---|
| Testnet real não integrada | `TestnetBlockchainProofProvider` é stub; ethers/viem não instalados |
| `txHash` real nunca preenchido | Apenas `simulated` por padrão |
| Reprocessamento de provas FAILED | Não implementado nesta fase |
| Prova de pagamento/webhook | Apenas quando PaymentIntent é criado e confirmado via webhook — `PAYMENT_CONFIRMED` não tem prova direta nesta fase |

---

## 12. Como Configurar Testnet Real (Futuro)

1. Instalar `ethers` ou `viem` como dependência.
2. Implementar a chamada real em `TestnetBlockchainProofProvider.submitProof()`.
3. Configurar no `.env`:
   ```env
   BLOCKCHAIN_PROVIDER=testnet
   BLOCKCHAIN_ENABLE_REAL_CALLS=true
   BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
   BLOCKCHAIN_PRIVATE_KEY=<chave-privada-testnet>   # NUNCA commitar
   BLOCKCHAIN_CONTRACT_ADDRESS=<endereço-do-contrato>
   BLOCKCHAIN_NETWORK=polygon_amoy
   ```
4. Nunca usar a chave privada de mainnet para testes.
5. Nunca commitar `BLOCKCHAIN_PRIVATE_KEY`.
