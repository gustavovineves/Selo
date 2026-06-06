# Destino de Recebimento — Selo API

## Conceito

O **Destino de Recebimento** é o dado bancário/Pix do usuário para onde o parceiro financeiro (Fitbank/BaaS) enviará o valor protegido quando um acordo com garantia for concluído.

### Diferença fundamental: Chave de Recebimento do App vs. Destino de Recebimento

| | Chave de Recebimento do App | Destino de Recebimento |
|---|---|---|
| **Exemplo** | `@maria`, `@joao` | CPF Pix `***.456`, E-mail Pix `m***@gmail.com` |
| **Para que serve** | Localizar o usuário dentro da plataforma | Indicar para onde o dinheiro será enviado |
| **Quem usa** | Criador do acordo informa a chave da contraparte | Backend usa o destino do recebedor no payout |
| **Obrigatório para** | Ser encontrado por outros usuários | Receber valor protegido em acordo com garantia |
| **Integração Pix real** | Não — handle interno | Futuro (Fitbank) — simulado no MVP |
| **Expõe dados sensíveis** | Não | Nunca: sempre retornado mascarado |

> **Fluxo resumido:**
> ```
> Criador informa @maria (Chave de Recebimento do App)
>   → sistema resolve → User#maria
>   → verifica se User#maria tem Destino de Recebimento ativo
>   → se não: 400 (recebedor precisa configurar destino)
>   → se sim: snapshot salvo no acordo (imutável)
> ```

---

## Status disponíveis

O schema atual tem dois status:

| Status | Descrição |
|---|---|
| `ACTIVE` | Destino ativo e disponível para receber |
| `DELETED` | Excluído logicamente (soft delete) |

> `INACTIVE`, `BLOCKED` e `PENDING_VERIFICATION` não existem no schema atual. Se necessários em fases futuras, requerem migration.

---

## Tipos suportados (ReceivingDestinationType)

| Valor | Descrição | Exemplo de maskedValue |
|---|---|---|
| `PIX_CPF` | Chave Pix tipo CPF | `***.456` |
| `PIX_CNPJ` | Chave Pix tipo CNPJ | `**.***.***/***-56` |
| `PIX_EMAIL` | Chave Pix tipo e-mail | `m***@gmail.com` |
| `PIX_PHONE` | Chave Pix tipo telefone | `(***) ***-4321` |
| `PIX_RANDOM` | Chave Pix aleatória (UUID) | `****-****-abcd` |

> **Dev/local:** o `pixKey` é armazenado internamente mas nunca retornado na API. Apenas `maskedValue` é exposto. Em produção, criptografia adicional deve ser avaliada antes de armazenar dados sensíveis.

---

## Endpoints

### `POST /api/v1/receiving-destinations`

Cadastrar um novo destino de recebimento.

**Auth:** JWT obrigatório

**Request:**
```json
{
  "type": "PIX_CPF",
  "pixKey": "12345678900",
  "label": "Minha conta principal",
  "isDefault": true
}
```

**Campos:**
| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `type` | `ReceivingDestinationType` | Sim | Tipo da chave Pix |
| `pixKey` | string (1–500) | Sim | Valor da chave (armazenado internamente) |
| `label` | string (1–100) | Não | Nome amigável; default = valor do pixKey |
| `isDefault` | boolean | Não | Se true, torna-se o destino padrão |

**Regra de default:**
- Se é o primeiro destino do usuário, vira default automaticamente mesmo sem `isDefault: true`.
- Se `isDefault: true`, os outros destinos ativos perdem o flag de default.

**Response 201:**
```json
{
  "id": "cm...",
  "type": "PIX_CPF",
  "maskedValue": "***.900",
  "label": "Minha conta principal",
  "status": "ACTIVE",
  "isDefault": true,
  "createdAt": "2026-06-05T00:00:00.000Z",
  "updatedAt": "2026-06-05T00:00:00.000Z"
}
```

**Erros:**
- `400` — type inválido, pixKey vazio
- `401` — sem token

---

### `GET /api/v1/receiving-destinations/me`

Lista os destinos de recebimento ativos do usuário autenticado.

**Auth:** JWT obrigatório

**Response 200:**
```json
[
  {
    "id": "cm...",
    "type": "PIX_CPF",
    "maskedValue": "***.900",
    "label": "Minha conta principal",
    "status": "ACTIVE",
    "isDefault": true,
    "createdAt": "2026-06-05T00:00:00.000Z",
    "updatedAt": "2026-06-05T00:00:00.000Z"
  }
]
```

Ordenação: default primeiro, depois por `createdAt asc`.

---

### `PATCH /api/v1/receiving-destinations/:id`

Atualizar `label` ou `isDefault` de um destino.

**Auth:** JWT obrigatório — somente o dono do destino

**Request:**
```json
{
  "label": "Conta corrente",
  "isDefault": true
}
```

**Campos:**
| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `label` | string (1–100) | Não | Novo nome amigável |
| `isDefault` | boolean | Não | Promover como padrão |

> Alterar `pixKey` ou `type` não é suportado nesta versão — representaria uma troca de chave que requer validação real com PSP.

**Response 200:** objeto destino atualizado (mesma estrutura do POST)

**Erros:**
- `403` — destino pertence a outro usuário
- `404` — destino não encontrado ou já excluído

---

### `DELETE /api/v1/receiving-destinations/:id`

Excluir logicamente o destino (soft delete). O registro permanece no banco com `status: DELETED`.

**Auth:** JWT obrigatório — somente o dono do destino

**Bloqueio de exclusão:** a exclusão é recusada com 409 se:
- O usuário tem acordos com garantia em estado bloqueante (como recebedor com `operationalStatus` em `AWAITING_ACCEPTANCE`, `ACTIVE` ou `AWAITING_CONFIRMATION`, ou `financialStatus` em `AWAITING_PAYMENT`, `FUNDS_HELD`, `AWAITING_PAYOUT` ou `DISPUTED`)
- Há payouts pendentes vinculados a este destino

**Mensagem de erro:**
> "Este destino de recebimento não pode ser alterado enquanto existirem acordos ou valores pendentes."

**Response 200:** objeto destino com `status: "DELETED"`

**Erros:**
- `403` — destino pertence a outro usuário
- `404` — destino não encontrado ou já excluído
- `409` — bloqueado por pendências

---

## Integração com Acordo com Garantia

Ao criar `POST /api/v1/agreements/guaranteed`, o sistema:

1. Resolve a `counterpartyKey` → identifica o recebedor
2. Busca o destino de recebimento ativo do recebedor (`findAnyActive`)
3. Se não houver destino ativo → `400 "O recebedor precisa configurar um destino de recebimento"`
4. Se houver → salva `receiverDestinationSnapshot` no acordo

### Snapshot salvo no acordo

```json
{
  "type": "PIX_CPF",
  "maskedValue": "***.456",
  "provider": "SIMULATED",
  "receivingDestinationId": "cm..."
}
```

### Travamento após criação

O `receiverDestinationSnapshot` é imutável. Após o acordo ser criado:
- Alterar ou excluir o destino de recebimento **não** altera o snapshot do acordo existente.
- O acordo continua usando os dados do snapshot original.
- Isso garante que o payout futuro use exatamente o destino que estava ativo na criação.

---

## Segurança e Privacidade

- O campo `pixKey` (dado bruto) **nunca** é retornado nas respostas da API.
- Todas as respostas expõem apenas `maskedValue`.
- Em produção, antes de armazenar `pixKey` em texto claro, avaliar criptografia a nível de campo (AES-256 com chave gerenciada por KMS).
- O `receiverDestinationSnapshot` salvo no acordo contém apenas `maskedValue` — nunca o dado bruto.

---

## Limitações conhecidas (MVP)

- Status limitados a `ACTIVE` e `DELETED` — sem `INACTIVE`, `BLOCKED` ou `PENDING_VERIFICATION`
- Não há validação do `pixKey` com o Banco Central (DICT) — dados são aceitos como informados
- Sem criptografia de campo para `pixKey` no armazenamento (adequado para dev/local; produção requer KMS)
- `PATCH` não permite alterar `type` ou `pixKey` — representaria troca de chave com revalidação necessária
- `provider: "SIMULATED"` no snapshot — em produção virá da integração Fitbank

---

## Testes com PowerShell

### Fluxo A — criar destino e verificar mascaramento

```powershell
# Login do usuário B (recebedor)
$bodyB = '{"email":"recebedor@selo.dev","password":"senha-123","firstName":"Maria","lastName":"Recebedora"}'
$regB = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/register" -Method Post -Body $bodyB -ContentType "application/json"
$tokenB = $regB.accessToken

# Criar destino CPF
$destBody = '{"type":"PIX_CPF","pixKey":"12345678900","label":"Conta pessoal"}'
$dest = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-destinations" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenB" } `
  -Body $destBody -ContentType "application/json"
Write-Host "maskedValue: $($dest.maskedValue)"  # ***.900
Write-Host "isDefault: $($dest.isDefault)"      # true (primeiro destino)
$destId = $dest.id

# Listar meus destinos
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-destinations/me" `
  -Headers @{ Authorization = "Bearer $tokenB" } | ConvertTo-Json
```

### Fluxo B — acordo bloqueado sem destino

```powershell
# Login do usuário A (criador/pagador)
$bodyA = '{"email":"pagador@selo.dev","password":"senha-123","firstName":"Joao","lastName":"Pagador"}'
$regA = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/register" -Method Post -Body $bodyA -ContentType "application/json"
$tokenA = $regA.accessToken

# Criar chave para A e para C (recebedor sem destino)
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenA" } -Body '{"key":"@pagador"}' -ContentType "application/json"

$bodyC = '{"email":"semdestino@selo.dev","password":"senha-123","firstName":"Carlos","lastName":"SemDestino"}'
$regC = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/register" -Method Post -Body $bodyC -ContentType "application/json"
$tokenC = $regC.accessToken
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenC" } -Body '{"key":"@carlos"}' -ContentType "application/json"

# A tenta criar acordo com garantia para C (sem destino) → deve retornar 400
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/guaranteed" -Method Post `
    -Headers @{ Authorization = "Bearer $tokenA" } `
    -Body '{"title":"Teste","counterpartyKey":"@carlos","amount":100}' -ContentType "application/json"
} catch { "400 esperado: $($_.Exception.Response.StatusCode)" }
```

### Fluxo C — acordo com garantia com destino (snapshot)

```powershell
# B cria chave e destino
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenB" } -Body '{"key":"@maria"}' -ContentType "application/json"

# A cria acordo com garantia para @maria (que tem destino)
$body = '{"title":"Serviço de design","counterpartyKey":"@maria","amount":350.00}'
$acordo = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/guaranteed" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenA" } -Body $body -ContentType "application/json"
$acordoId = $acordo.id
Write-Host "receiverDestinationSnapshot: $($acordo.receiverDestinationSnapshot | ConvertTo-Json)"
# { "type": "PIX_CPF", "maskedValue": "***.900", "provider": "SIMULATED", "receivingDestinationId": "cm..." }
```

### Fluxo D — bloqueio de exclusão com acordo ativo

```powershell
# B aceita o acordo acima (que está AWAITING_ACCEPTANCE)
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$acordoId/accept" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenB" }

# Tentar excluir destino de B enquanto há acordo ACTIVE → deve retornar 409
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-destinations/$destId" -Method Delete `
    -Headers @{ Authorization = "Bearer $tokenB" }
} catch { "409 esperado: $($_.Exception.Response.StatusCode)" }
```

### Fluxo E — snapshot imutável após criação

```powershell
# Atualizar label do destino de B (não afeta acordos existentes)
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-destinations/$destId" -Method Patch `
  -Headers @{ Authorization = "Bearer $tokenB" } `
  -Body '{"label":"Nova label"}' -ContentType "application/json"

# Verificar que o acordo mantém o snapshot original
$acordoAtualizado = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$acordoId" `
  -Headers @{ Authorization = "Bearer $tokenA" }
Write-Host "Snapshot original mantido: $($acordoAtualizado.receiverDestinationSnapshot | ConvertTo-Json)"
```

---

## Arquivos implementados

- `apps/api/src/modules/receiving-destinations/receiving-destinations.service.ts` — CRUD completo + masking + bloqueio
- `apps/api/src/modules/receiving-destinations/receiving-destinations.controller.ts` — POST, GET /me, PATCH /:id, DELETE /:id
- `apps/api/src/modules/receiving-destinations/dto/create-receiving-destination.dto.ts` — reescrito
- `apps/api/src/modules/receiving-destinations/dto/update-receiving-destination.dto.ts` — criado
- `apps/api/src/modules/agreements/agreements.service.ts` — `createGuaranteed` atualizado com verificação e snapshot
- `apps/api/src/modules/agreements/agreements.module.ts` — importa `ReceivingDestinationsModule`

---

## Destino de Recebimento no App Mobile (Fase 12)

### Serviços mobile (já existiam na Fase 9, utilizados na Fase 12)

```typescript
// receiving-destinations.service.ts
getMe()                            → GET  /receiving-destinations/me
create(payload)                    → POST /receiving-destinations
update(id, { label, isDefault })   → PATCH /receiving-destinations/:id
remove(id)                         → DELETE /receiving-destinations/:id
```

### UX no app

- **Lista**: cada destino exibe tipo (badge colorido), `maskedValue`, label e badge "Padrão"
- **Definir padrão**: botão "Definir padrão" por destino → `PATCH /:id { isDefault: true }`
- **Editar**: expande formulário inline com campo label + toggle isDefault → `PATCH /:id`
- **Excluir**: confirmação → `DELETE /:id` → 409 se há pendências → mensagem amigável: "Este destino não pode ser excluído porque ainda está vinculado a acordos ou valores pendentes."
- **Adicionar**: formulário inline com:
  - Seletor de tipo (chips: CPF, E-mail, Telefone, Aleatória)
  - Campo "Valor da chave" com placeholder contextual por tipo
  - Campo "Apelido" (opcional)
  - Toggle "Definir como padrão"
  - Nota de dev: "Ambiente de desenvolvimento: destino simulado."

### Terminologia no app

| Técnico | App |
|---|---|
| `ReceivingDestination` | Destino de Recebimento |
| `pixKey` | valor da chave (nunca exibido — apenas `maskedValue`) |
| `PIX_CPF` | CPF |
| `PIX_EMAIL` | E-mail |
| `PIX_PHONE` | Telefone |
| `PIX_RANDOM` | Aleatória |
| `isDefault` | Padrão |

### Limitações no app (MVP)

- `pixKey` não é validado com o Banco Central — qualquer valor é aceito em dev
- Não há criptografia de campo para o `pixKey` armazenado
- Não é possível alterar `type` ou `pixKey` via `PATCH` — apenas `label` e `isDefault`
- Para trocar a chave Pix de um destino, o usuário deve cadastrar um novo e excluir o antigo
- O aviso "Para trocar o destino, cadastre um novo e defina como padrão" é exibido no formulário de edição
