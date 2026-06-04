# Módulos do Backend

## auth
**Rota base:** `/api/v1/auth`

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/register` | Não | Cria conta e retorna tokens |
| POST | `/login` | Não | Autentica e retorna tokens |
| POST | `/refresh` | Não | Renova access token |
| GET | `/me` | Sim | Retorna usuário autenticado |
| POST | `/logout` | Sim | Invalida sessão |

---

## users
**Rota base:** `/api/v1/users`

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/:id` | Sim | Busca usuário por ID |
| PATCH | `/me` | Sim | Atualiza dados do usuário |

---

## profiles
**Rota base:** `/api/v1/profiles`

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/:userId` | Sim | Perfil público de um usuário |
| PATCH | `/me` | Sim | Atualiza perfil do usuário logado |

---

## receiving-keys
**Rota base:** `/api/v1/receiving-keys`

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/` | Sim | Lista chaves Pix do usuário |
| POST | `/` | Sim | Cadastra nova chave Pix |
| PATCH | `/:id/default` | Sim | Define chave como padrão |
| DELETE | `/:id` | Sim | Remove chave (soft delete) |

---

## receiving-destinations
**Rota base:** `/api/v1/receiving-destinations`

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/` | Sim | Lista destinos salvos |
| POST | `/` | Sim | Salva novo destino |
| DELETE | `/:id` | Sim | Remove destino |

---

## agreements
**Rota base:** `/api/v1/agreements`

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/` | Sim | Lista acordos do usuário (paginado) |
| GET | `/:id` | Sim | Detalhe de um acordo |
| POST | `/` | Sim | Cria novo acordo |
| PATCH | `/:id/accept` | Sim | Aceita acordo |
| PATCH | `/:id/complete` | Sim | Conclui acordo |
| PATCH | `/:id/cancel` | Sim | Cancela acordo |

**Status possíveis:** `DRAFT → PENDING_ACCEPTANCE → ACTIVE → COMPLETED / DISPUTED / CANCELLED / EXPIRED`

---

## agreement-events
**Rota base:** `/api/v1/agreements/:agreementId/events`

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/` | Sim | Histórico de eventos do acordo |

---

## financial-guarantees
**Rota base:** `/api/v1/financial-guarantees`

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/:id` | Sim | Detalhe da garantia |
| POST | `/` | Sim | Cria garantia para um acordo |
| PATCH | `/:id/release` | Sim | Libera garantia |
| PATCH | `/:id/revert` | Sim | Reverte garantia |

---

## payments
**Rota base:** `/api/v1/payments`

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/:id` | Sim | Detalhe do pagamento |
| POST | `/` | Sim | Cria registro de pagamento |

---

## pix
**Rota base:** `/api/v1/pix`  
**Status:** Stub — Fase 2

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/charge/:paymentId` | Sim | Gera cobrança Pix (Fase 2) |
| POST | `/webhook` | Não | Webhook de confirmação |

---

## disputes
**Rota base:** `/api/v1/disputes`

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/:id` | Sim | Detalhe da disputa |
| POST | `/` | Sim | Abre disputa em um acordo |
| PATCH | `/:id/resolve` | Sim | Resolve disputa (admin — Fase 4) |

---

## trust-score
**Rota base:** `/api/v1/trust-score`

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/me` | Sim | Score do usuário logado |
| GET | `/:userId` | Sim | Score público de um usuário |

---

## blockchain-records
**Rota base:** `/api/v1/blockchain-records`  
**Status:** Stub — Fase 4

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/:agreementId` | Sim | Registro blockchain do acordo |

---

## notifications
**Rota base:** `/api/v1/notifications`

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/` | Sim | Lista notificações |
| PATCH | `/:id/read` | Sim | Marca como lida |
| PATCH | `/read-all` | Sim | Marca todas como lidas |

---

## audit-logs
**Rota base:** `/api/v1/audit-logs`

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/mine` | Sim | Logs de auditoria do usuário |

---

## admin
**Rota base:** `/api/v1/admin`

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/stats` | Sim | Estatísticas gerais |
| GET | `/health` | Sim | Health check |
