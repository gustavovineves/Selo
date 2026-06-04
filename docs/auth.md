# Autenticação — Selo API

## Visão Geral

O Selo usa **JWT** com dois tokens:

| Token | Duração padrão | Onde usar |
|---|---|---|
| `accessToken` | 15 minutos | `Authorization: Bearer <token>` em todo endpoint protegido |
| `refreshToken` | 7 dias | Apenas no endpoint `POST /auth/refresh` |

Cada par de tokens está vinculado a uma **DeviceSession** no banco. Isso permite:
- Logout específico por dispositivo
- Detecção de reutilização de refresh token (revoga automaticamente a sessão)
- Histórico de sessões por usuário

---

## ⚠️ Aviso — Senha temporária para desenvolvimento

O fluxo atual usa **email + senha** apenas para facilitar o desenvolvimento local. O produto final migrará para **login sem senha** via código de verificação enviado por SMS ou email.

Quando migrar, o campo `passwordHash` em `User` pode ser marcado como opcional ou removido. A estrutura de `DeviceSession` permanece válida para ambos os fluxos.

---

## Endpoints

### `POST /api/v1/auth/register`

Cria conta, perfil e score de confiança inicial.

**Request:**
```json
{
  "email": "joao@exemplo.com",
  "password": "minha-senha-123",
  "firstName": "João",
  "lastName": "Silva",
  "phone": "+5511999990000"
}
```

**Response 201:**
```json
{
  "user": {
    "id": "cuid...",
    "email": "joao@exemplo.com",
    "status": "ACTIVE",
    "kycStatus": "PENDING",
    "emailVerifiedAt": null,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "profile": {
      "id": "cuid...",
      "fullName": "João Silva",
      "displayName": "João",
      "avatarUrl": null
    },
    "trustScore": {
      "score": 500,
      "level": "MEDIUM"
    }
  },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Erros:**
- `409 Conflict` — email já cadastrado
- `400 Bad Request` — dados inválidos

---

### `POST /api/v1/auth/login`

Autentica e cria uma nova sessão.

**Request:**
```json
{
  "email": "joao@exemplo.com",
  "password": "minha-senha-123"
}
```

**Response 200:** (mesmo formato do register, sem campo `user.passwordHash`)

**Erros:**
- `401 Unauthorized` — credenciais inválidas ou conta suspensa

---

### `POST /api/v1/auth/refresh`

Renova o access token usando o refresh token.

**Request:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response 200:**
```json
{
  "accessToken": "eyJ..."
}
```

**Erros:**
- `401 Unauthorized` — token inválido, expirado, sessão revogada ou reuso detectado

> **Segurança:** Se o sistema detectar que o mesmo refresh token está sendo usado após já ter sido validado (token reuse attack), a sessão é revogada imediatamente.

---

### `GET /api/v1/auth/me`

Retorna o usuário autenticado com perfil completo.

**Headers:** `Authorization: Bearer <accessToken>`

**Response 200:**
```json
{
  "id": "cuid...",
  "email": "joao@exemplo.com",
  "phone": null,
  "status": "ACTIVE",
  "kycStatus": "PENDING",
  "emailVerifiedAt": null,
  "phoneVerifiedAt": null,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z",
  "profile": {
    "id": "cuid...",
    "fullName": "João Silva",
    "displayName": "João",
    "avatarUrl": null,
    "bio": null,
    "city": null,
    "state": null,
    "country": "BR",
    "birthDate": null
  },
  "trustScore": {
    "score": 500,
    "level": "MEDIUM"
  }
}
```

---

### `POST /api/v1/auth/logout`

Revoga a sessão atual (baseada no access token).

**Headers:** `Authorization: Bearer <accessToken>`

**Response 204:** (sem body)

---

## Endpoint de Perfil

### `PATCH /api/v1/users/me/profile`

Atualiza o perfil do usuário autenticado.

**Headers:** `Authorization: Bearer <accessToken>`

**Request (todos os campos opcionais):**
```json
{
  "firstName": "João",
  "lastName": "Silva",
  "displayName": "Joãozinho",
  "avatarUrl": "https://cdn.exemplo.com/avatar.jpg",
  "birthDate": "1990-05-20",
  "bio": "Desenvolvedor e empreendedor"
}
```

**Response 200:** objeto `UserProfile` atualizado

---

## Como testar com curl / PowerShell

### Registrar usuário

```powershell
$body = '{"email":"teste@selo.dev","password":"senha-teste-123","firstName":"Teste","lastName":"Selo"}'
$res = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/register" -Method Post -Body $body -ContentType "application/json"
$res | ConvertTo-Json -Depth 5
```

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@selo.dev","password":"senha-teste-123","firstName":"Teste","lastName":"Selo"}' | jq
```

### Login

```powershell
$body = '{"email":"teste@selo.dev","password":"senha-teste-123"}'
$login = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" -Method Post -Body $body -ContentType "application/json"
$token = $login.accessToken
$refresh = $login.refreshToken
```

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@selo.dev","password":"senha-teste-123"}' | jq
```

### Acessar /me

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/me" `
  -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 5
```

```bash
curl -s http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" | jq
```

### Atualizar perfil

```powershell
$body = '{"firstName":"João","lastName":"Silva","bio":"Desenvolvedor"}'
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/users/me/profile" -Method Patch `
  -Headers @{ Authorization = "Bearer $token" } `
  -Body $body -ContentType "application/json" | ConvertTo-Json -Depth 5
```

```bash
curl -s -X PATCH http://localhost:3000/api/v1/users/me/profile \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"João","lastName":"Silva","bio":"Desenvolvedor"}' | jq
```

### Renovar access token

```powershell
$body = "{`"refreshToken`":`"$refresh`"}"
$renewed = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/refresh" -Method Post -Body $body -ContentType "application/json"
$newToken = $renewed.accessToken
```

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"SEU_REFRESH_TOKEN"}' | jq
```

### Logout

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/logout" -Method Post `
  -Headers @{ Authorization = "Bearer $token" }
```

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"
```

---

## Fluxo Futuro — Login por Código (sem senha)

No produto final, o fluxo de autenticação será:

```
1. Usuário informa email ou telefone
2. Sistema envia código de 6 dígitos (OTP) por SMS ou email
3. Usuário confirma o código
4. Sistema cria DeviceSession e retorna accessToken + refreshToken
```

Para isso, será necessário:
- Remover ou tornar opcional `User.passwordHash`
- Criar tabela `OtpCode` com `userId`, `code` (hash), `expiresAt`, `usedAt`
- Criar endpoints `POST /auth/request-code` e `POST /auth/verify-code`
- Integrar provedor de SMS (ex: Twilio, AWS SNS) ou email transacional

A estrutura de `DeviceSession` e tokens JWT permanece idêntica.
