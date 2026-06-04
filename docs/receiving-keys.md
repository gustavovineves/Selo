# Chave de Recebimento do App — Selo API

## O que é a Chave de Recebimento do App

A **Chave de Recebimento do App** é uma chave interna da plataforma Selo, no formato `@handle`. Funciona como um nome de usuário público para identificar e localizar alguém dentro do app.

**O que ela faz:**
- Identifica o usuário dentro do Selo
- Permite que outra pessoa encontre você para criar acordos
- É usada para confirmar visualmente quem é o recebedor antes de qualquer acordo

**O que ela NÃO é:**
- Não é uma chave Pix oficial
- Não recebe dinheiro diretamente
- Não representa destino financeiro final
- Não é transferível entre usuários

> Em fases futuras (Pix real), será adicionada a integração com chaves Pix reais (CPF, CNPJ, email, telefone, aleatória). A Chave de Recebimento do App continuará existindo como handle interno.

---

## Regras do Handle

| Regra | Valor |
|---|---|
| Formato | `@handle` (com ou sem `@` na entrada) |
| Caracteres permitidos | Letras (a-z), números, ponto, underline, hífen |
| Tamanho mínimo | 3 caracteres (sem `@`) |
| Tamanho máximo | 30 caracteres (sem `@`) |
| Unicidade | Global — handle excluído não pode ser reutilizado no MVP |
| Por usuário | Máximo **uma chave ativa** por vez |
| Exclusão | Soft delete — `status: DELETED`, campo `deletedAt` preenchido |

### Handles Reservados

`admin`, `suporte`, `support`, `selo`, `system`, `root`, `api`, `auth`, `pix`, `fitbank`, `null`, `undefined`, `deleted`, `me`

---

## Endpoints

### `POST /api/v1/receiving-keys`

Cria a Chave de Recebimento do App para o usuário autenticado.

**Auth:** JWT obrigatório

**Request:**
```json
{
  "key": "@erika"
}
```
> O `@` é opcional. `"erika"`, `"@erika"` e `"@ERIKA"` produzem o mesmo resultado.

**Response 201:**
```json
{
  "id": "cuid...",
  "key": "@erika",
  "normalizedKey": "erika",
  "status": "ACTIVE",
  "isDefault": true,
  "createdAt": "2026-06-04T00:00:00.000Z"
}
```

**Erros:**
- `400 Bad Request` — handle inválido (formato, tamanho, reservado)
- `401 Unauthorized` — sem token
- `409 Conflict` — já existe chave ativa, ou handle já em uso

---

### `GET /api/v1/receiving-keys/me`

Retorna a chave ativa do usuário autenticado.

**Auth:** JWT obrigatório

**Response 200:**
```json
{
  "id": "cuid...",
  "key": "@erika",
  "normalizedKey": "erika",
  "status": "ACTIVE",
  "isDefault": true,
  "createdAt": "2026-06-04T00:00:00.000Z",
  "updatedAt": "2026-06-04T00:00:00.000Z"
}
```

**Erros:**
- `401 Unauthorized` — sem token
- `404 Not Found` — usuário não tem chave ativa

---

### `GET /api/v1/receiving-keys/history`

Lista todas as chaves do usuário autenticado, incluindo excluídas.

**Auth:** JWT obrigatório

**Response 200:**
```json
[
  {
    "id": "cuid...",
    "key": "@erika",
    "normalizedKey": "erika",
    "status": "ACTIVE",
    "isDefault": true,
    "deletedAt": null,
    "createdAt": "2026-06-04T00:00:00.000Z"
  },
  {
    "id": "cuid...",
    "key": "@erikaold",
    "normalizedKey": "erikaold",
    "status": "DELETED",
    "isDefault": false,
    "deletedAt": "2026-05-01T00:00:00.000Z",
    "createdAt": "2026-04-01T00:00:00.000Z"
  }
]
```

---

### `GET /api/v1/receiving-keys/check/:key`

Verifica se um handle está disponível. **Endpoint público.**

**Auth:** Não obrigatório

**Exemplos:**
- `GET /api/v1/receiving-keys/check/erika`
- `GET /api/v1/receiving-keys/check/@erika`

**Response 200 — disponível:**
```json
{ "available": true }
```

**Response 200 — indisponível:**
```json
{ "available": false }
```

**Response 200 — inválido:**
```json
{ "available": false, "reason": "invalid_format" }
```

**Response 200 — reservado:**
```json
{ "available": false, "reason": "reserved" }
```

---

### `GET /api/v1/receiving-keys/resolve/:key`

Resolve um handle para exibir confirmação visual do recebedor antes de um acordo. **Endpoint público.**

Retorna apenas dados públicos — nunca expõe CPF, email, telefone, dados financeiros ou KYC.

**Auth:** Não obrigatório

**Response 200:**
```json
{
  "userId": "cuid...",
  "displayName": "Érika Neves",
  "avatarUrl": null,
  "key": "@erika",
  "canReceiveAgreements": true
}
```

**Erros:**
- `404 Not Found` — handle não encontrado, excluído, em quarentena ou inativo

---

### `DELETE /api/v1/receiving-keys/me`

Exclui (soft delete) a chave ativa do usuário autenticado.

**Auth:** JWT obrigatório

A exclusão é bloqueada se houver pendências (ver regras abaixo).

**Response 200:**
```json
{
  "id": "cuid...",
  "key": "@erika",
  "normalizedKey": "erika",
  "status": "DELETED",
  "deletedAt": "2026-06-04T12:00:00.000Z"
}
```

**Erros:**
- `401 Unauthorized` — sem token
- `404 Not Found` — sem chave ativa
- `409 Conflict` — pendências bloqueiam exclusão

---

## Regras de Exclusão — Pendências

A exclusão é **bloqueada** se o usuário tiver qualquer uma das seguintes situações:

| Tipo | Condição de Bloqueio |
|---|---|
| Acordo ativo | `operationalStatus`: AWAITING_ACCEPTANCE, ACTIVE ou AWAITING_CONFIRMATION |
| Pagamento pendente | `PaymentIntent.status`: PENDING ou AWAITING_PAYMENT |
| Payout pendente | `Payout.status`: PENDING ou PROCESSING |
| Reembolso pendente | `Refund.status`: PENDING ou PROCESSING |
| Disputa aberta | `Dispute.status`: OPEN, UNDER_REVIEW ou AWAITING_EVIDENCE |

**Mensagem de erro retornada:**
```
Esta chave não pode ser excluída enquanto existirem acordos, pagamentos ou disputas pendentes.
```

---

## Normalização do Handle

| Entrada | Normalizado | Exibido |
|---|---|---|
| `"erika"` | `erika` | `@erika` |
| `"@erika"` | `erika` | `@erika` |
| `"@ERIKA"` | `erika` | `@erika` |
| `"  @Erika  "` | `erika` | `@erika` |

O campo `key` no banco armazena o handle com `@`. O campo `normalizedKey` armazena sem `@`, em minúsculas, e é globalmente único.

---

## Testes com PowerShell

### 1. Registrar e autenticar

```powershell
# Registrar
$body = '{"email":"erika@selo.dev","password":"senha-teste-123","firstName":"Erika","lastName":"Neves"}'
$reg = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/register" -Method Post -Body $body -ContentType "application/json"
$token = $reg.accessToken

# Ou fazer login se já existe
$body = '{"email":"erika@selo.dev","password":"senha-teste-123"}'
$login = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" -Method Post -Body $body -ContentType "application/json"
$token = $login.accessToken
```

### 2. Verificar disponibilidade (público)

```powershell
# Disponível
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys/check/erika"

# Com @
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys/check/@erika"

# Reservado
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys/check/admin"

# Inválido
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys/check/a"
```

### 3. Criar chave

```powershell
$body = '{"key":"@erika"}'
$key = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys" -Method Post `
  -Headers @{ Authorization = "Bearer $token" } `
  -Body $body -ContentType "application/json"
$key | ConvertTo-Json
```

### 4. Consultar minha chave

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys/me" `
  -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json
```

### 5. Resolver chave (público — confirmação visual do recebedor)

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys/resolve/erika"
# ou
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys/resolve/@erika"
```

### 6. Tentar criar segunda chave ativa (deve falhar com 409)

```powershell
$body = '{"key":"@erika2"}'
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys" -Method Post `
    -Headers @{ Authorization = "Bearer $token" } `
    -Body $body -ContentType "application/json"
} catch {
  $_.Exception.Response.StatusCode # deve retornar 409
}
```

### 7. Listar histórico

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys/history" `
  -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 5
```

### 8. Excluir chave

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys/me" -Method Delete `
  -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json
```

### 9. Tentar resolver chave excluída (deve retornar 404)

```powershell
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys/resolve/erika"
} catch {
  $_.Exception.Response.StatusCode # deve retornar 404
}
```

### 10. Criar nova chave após exclusão

```powershell
# erika está deletado — não pode ser reutilizado
$body = '{"key":"erika"}'
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys" -Method Post `
    -Headers @{ Authorization = "Bearer $token" } `
    -Body $body -ContentType "application/json"
} catch {
  "Handle ainda bloqueado (normalizedKey @unique)"
}

# Novo handle funciona
$body = '{"key":"erika.neves"}'
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys" -Method Post `
  -Headers @{ Authorization = "Bearer $token" } `
  -Body $body -ContentType "application/json" | ConvertTo-Json
```

---

## Mensagens de Erro

| Código | Situação | Mensagem |
|---|---|---|
| 400 | Handle muito curto | Handle deve ter no mínimo 3 caracteres. |
| 400 | Handle muito longo | Handle deve ter no máximo 30 caracteres. |
| 400 | Formato inválido | Handle só pode conter letras, números, ponto, underline ou hífen. |
| 400 | Handle reservado | Este handle é reservado e não pode ser usado. |
| 401 | Sem token | Unauthorized |
| 404 | Sem chave ativa | Nenhuma chave ativa encontrada. |
| 404 | Handle inexistente/inativo | Chave não encontrada ou indisponível. |
| 409 | Já tem chave ativa | Você já tem uma chave ativa. Exclua-a antes de criar uma nova. |
| 409 | Handle em uso | Este handle já está em uso. |
| 409 | Pendências bloqueiam exclusão | Esta chave não pode ser excluída enquanto existirem acordos, pagamentos ou disputas pendentes. |

---

## Implementação Interna

**Tipo no banco:** `ReceivingKeyType.RANDOM`

No MVP (Fase 3), handles internos usam `type = RANDOM` no schema, que é o tipo mais próximo semânticamente (identificador aleatório não vinculado a documento). Quando a integração Pix real for implementada (Fase 4-5), será avaliado adicionar `APP_HANDLE` ao enum `ReceivingKeyType`.

**Arquivos:**
- `apps/api/src/modules/receiving-keys/receiving-keys.service.ts`
- `apps/api/src/modules/receiving-keys/receiving-keys.controller.ts`
- `apps/api/src/modules/receiving-keys/dto/create-receiving-key.dto.ts`
