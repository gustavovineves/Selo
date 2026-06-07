# Verificação Financeira — Selo

> Criado na Fase 25. Descreve o modelo de KYC Progressivo: quando é pedido, como funciona, o que é armazenado e como testar em sandbox.

---

## 1. Princípio

**Cadastro inicial é leve.** O Selo não pede CPF no registro.

A verificação financeira só aparece quando o usuário quer usar recursos de valor protegido:
- Criar acordo com garantia financeira
- Pagar valor protegido
- Receber valor protegido
- Configurar destino de recebimento financeiro
- Futuramente: movimentar valor via parceiro BaaS

Este modelo é chamado internamente de **KYC Progressivo** — mas a linguagem na UI do usuário é sempre "verificação financeira" ou "valor protegido". Termos como KYC, AML, compliance, bureaus e Banco Central nunca aparecem na interface do usuário comum.

---

## 2. Status de Verificação

O `User.kycStatus` controla o nível de verificação do usuário:

| Status (`KycStatus`) | Label para o usuário | Significado |
|---|---|---|
| `PENDING` | "Verificação não iniciada" | Padrão. Usuário nunca iniciou o processo. |
| `SUBMITTED` | "Em análise" | Dados enviados, aguardando revisão. |
| `UNDER_REVIEW` | "Em revisão detalhada" | Revisão manual em andamento. |
| `APPROVED` | "Aprovado para valor protegido" | Pode usar todos os recursos financeiros. |
| `REJECTED` | "Verificação não aprovada" | Dados recusados; pode corrigir e reenviar. |

---

## 3. Regras de Acesso por Recurso

| Recurso | kycStatus necessário |
|---|---|
| Criar conta | Nenhum |
| Criar chave de recebimento | Nenhum |
| Criar acordo simples | Nenhum |
| Visualizar acordos | Nenhum |
| Criar acordo COM GARANTIA | `SUBMITTED`, `UNDER_REVIEW` ou `APPROVED` |
| Pagar valor protegido (sandbox) | `SUBMITTED` ou `APPROVED` (produção: `APPROVED`) |
| Payout real futuro (recebedor) | `APPROVED` obrigatório |

---

## 4. Dados Coletados

| Dado | Onde fica | Obrigatório para submit |
|---|---|---|
| CPF (dígitos) | `User.document` | Sim |
| Tipo do documento | `User.documentType = CPF` | Automático |
| Nome completo | `UserProfile.fullName` | Recomendado |
| Data de nascimento | `UserProfile.birthDate` | Recomendado |
| Telefone | `User.phone` | Recomendado |
| Aceite dos termos financeiros | `FinancialProfile.acceptedFinancialTermsAt` | Sim |
| Data de submissão | `FinancialProfile.kycSubmittedAt` | Automático |
| Data de aprovação | `FinancialProfile.kycApprovedAt` | Automático |
| Data de rejeição | `FinancialProfile.kycRejectedAt` | Automático |
| Motivo de rejeição | `FinancialProfile.kycRejectionReason` | Automático |
| Nível de verificação | `FinancialProfile.verificationLevel` | Automático |

### Nível de Verificação (`FinancialVerificationLevel`)

| Nível | Critério |
|---|---|
| `NONE` | Nenhum dado informado |
| `BASIC` | CPF + nome + aceite de termos |
| `STANDARD` | BASIC + data de nascimento + telefone |
| `FULL` | Aprovação concluída |

---

## 5. Endpoints

Todos exigem JWT de usuário autenticado (`Authorization: Bearer <token>`).

### `GET /api/v1/users/me/financial-profile`

Retorna o estado atual da verificação financeira.

**Response 200:**
```json
{
  "kycStatus": "PENDING",
  "kycStatusLabel": "Verificação não iniciada",
  "financialVerificationLevel": "NONE",
  "cpfMasked": null,
  "fullName": null,
  "birthDate": null,
  "phone": null,
  "acceptedFinancialTerms": false,
  "acceptedFinancialTermsAt": null,
  "kycSubmittedAt": null,
  "kycApprovedAt": null,
  "kycRejectedAt": null,
  "kycRejectionReason": null,
  "pendingRequirements": ["nome completo", "CPF", "data de nascimento", "telefone", "aceitar termos de valor protegido"],
  "humanMessage": "Para usar valor protegido, complete a verificação financeira."
}
```

---

### `PATCH /api/v1/users/me/financial-profile`

Salva ou atualiza dados de verificação (antes de submeter).

**Body:**
```json
{
  "fullName": "Alice Silva",
  "cpf": "11144477735",
  "birthDate": "1990-01-15",
  "phone": "+5511999999999",
  "acceptedFinancialTerms": true
}
```

**Validações:**
- CPF validado por algoritmo (dígitos verificadores)
- CPF único por usuário
- Nenhum campo é obrigatório neste endpoint (atualização incremental)

**Response 200:** mesmo formato de `GET /financial-profile` com dados atualizados.

---

### `POST /api/v1/users/me/financial-profile/submit`

Envia dados para análise. Muda `kycStatus → SUBMITTED`.

**Pré-requisitos:**
- `acceptedFinancialTermsAt` preenchido (termos aceitos)
- `User.document` (CPF) preenchido

**Response 200:** financial profile atualizado com `kycStatus: "SUBMITTED"`.

---

### `POST /api/v1/users/me/financial-profile/simulate-approval`

**Apenas em `development` e `test`.** Aprova o usuário para testes locais e E2E.

Bloqueado em `production` (HTTP 403).

---

### `POST /api/v1/users/me/financial-profile/simulate-rejection`

**Apenas em `development` e `test`.** Rejeita o usuário com motivo simulado.

**Body (opcional):**
```json
{ "reason": "CPF divergente" }
```

---

## 6. Segurança e Privacidade

| Dado | Comportamento |
|---|---|
| CPF | Nunca logado. Mascarado em todas as respostas (`***.456.789-**`) |
| `User.document` | Nunca retornado sem mascaramento |
| Admin vê CPF? | Apenas mascarado (`cpfMasked`) — o campo `document` é removido da resposta |
| Imagem de documento | **Não implementado** — upload de documento fica para fase futura |
| Consulta externa (Receita, Serpro) | **Não implementada** — fase futura com parceiro KYC real |

---

## 7. CPF — Validação e Mascaramento

### Validação

O CPF é validado pelo algoritmo oficial (dígitos verificadores). Implementado em:
`apps/api/src/common/utils/cpf.util.ts`

Regras:
- Exatamente 11 dígitos numéricos
- Não pode ser todos os dígitos iguais (ex: `11111111111`)
- Dígitos verificadores válidos

### Mascaramento

Formato: `***.456.789-**`
- Oculta os 3 primeiros e os 2 últimos dígitos
- Os 6 dígitos do meio são exibidos

---

## 8. Impacto nos Acordos

### Acordo Simples

Nenhum impacto. `kycStatus` pode ser `PENDING`.

### Acordo com Garantia

O **criador/pagador** precisa ter `kycStatus` em `SUBMITTED`, `UNDER_REVIEW` ou `APPROVED`.

Se `kycStatus === PENDING`, a criação falha com:
```
HTTP 400: "Para criar um acordo com valor protegido, complete a verificação financeira primeiro."
```

O app mobile redireciona automaticamente para a tela de verificação financeira.

O **recebedor** precisa ter:
- Destino de recebimento ativo (`ReceivingDestination.status = ACTIVE`)
- KYC não é obrigatório para o recebedor aceitar o acordo (mas será necessário para payout real)

---

## 9. Trust Score

Verificação aprovada contribui para o score de confiança:

| Evento | Delta |
|---|---|
| `KYC_VERIFIED` (aprovação) | +50 pontos |

---

## 10. Notificações In-App

| Evento | Tipo | Mensagem |
|---|---|---|
| Dados enviados para análise | `KYC_SUBMITTED` | "Recebemos seus dados. Analisaremos em breve." |
| Verificação aprovada | `KYC_APPROVED` | "Sua verificação foi aprovada. Você já pode usar o valor protegido." |
| Verificação recusada | `KYC_REJECTED` | "Sua verificação não foi aprovada. Corrija os dados e tente novamente." |

---

## 11. Mobile — Tela de Verificação Financeira

**Caminho:** `apps/mobile/app/financial-verification.tsx`

**Como acessar:**
- Perfil → Verificação financeira
- Ao tentar criar acordo com garantia sem KYC → Alert com botão "Verificar"

**Funcionalidades:**
- Banner de status (não iniciada / em análise / aprovado / recusado)
- Formulário: nome, CPF, data de nascimento, telefone, aceite de termos
- Botão "Salvar dados" (PATCH /financial-profile)
- Botão "Enviar para verificação" (POST /financial-profile/submit)
- Botão de simulação de aprovação (apenas em desenvolvimento)
- Motivo de rejeição exibido quando `REJECTED`

**Linguagem:**
- "Verificação financeira" (não "KYC")
- "Valor protegido" (não "garantia")
- "Confirmar informações" (não "compliance")
- "Em análise" (não "SUBMITTED")
- "Aprovado para valor protegido" (não "KYC APPROVED")

---

## 12. Admin — Visualização

O painel admin exibe, no detalhe do usuário:
- `kycStatus` (status atual)
- `cpfMasked` (CPF mascarado — admin não vê o CPF completo)
- `financialProfile.verificationLevel`
- `financialProfile.kycSubmittedAt`
- `financialProfile.kycApprovedAt`
- `financialProfile.kycRejectedAt`
- `financialProfile.kycRejectionReason`

---

## 13. Ambiente de Testes

### Variáveis de Ambiente

| Variável | Valor em CI | Descrição |
|---|---|---|
| `KYC_PROVIDER` | `simulated` | Provedor simulado — sem chamada real |
| `KYC_ENABLE_REAL_CALLS` | `false` | Nunca mudar para `true` sem instrução explícita |

### Simular Aprovação Localmente

```bash
# 1. Criar conta e obter token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@test.local","password":"senha123"}' | jq -r .accessToken)

# 2. Ver estado atual da verificação
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/users/me/financial-profile

# 3. Atualizar dados
curl -X PATCH http://localhost:3000/api/v1/users/me/financial-profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Dev Teste","cpf":"11144477735","acceptedFinancialTerms":true}'

# 4. Enviar para análise
curl -X POST http://localhost:3000/api/v1/users/me/financial-profile/submit \
  -H "Authorization: Bearer $TOKEN"

# 5. Simular aprovação (apenas em development/test)
curl -X POST http://localhost:3000/api/v1/users/me/financial-profile/simulate-approval \
  -H "Authorization: Bearer $TOKEN"
```

---

## 14. Restrições Absolutas desta Fase

| Restrição | Status |
|---|---|
| CPF pedido no cadastro inicial? | **Não** |
| KYC real integrado? | **Não** |
| Consulta ao Banco Central? | **Não** |
| Consulta ao Serpro? | **Não** |
| Consulta a bureau (Serasa, SPC)? | **Não** |
| Chamada externa real? | **Não** |
| Imagem de documento? | **Não** |
| CPF exposto sem máscara? | **Não** |
| CPF logado? | **Não** |
| Dinheiro real movimentado? | **Não** |
| Fitbank real? | **Não** |
| KYC_ENABLE_REAL_CALLS=true? | **Não** |
| Simulação em production? | **Não** (HTTP 403) |

---

## 15. Próxima Fase (Não Implementar Agora)

**Fase 26 — Blockchain Testnet como Prova**

Objetivo: registrar hashes dos acordos em testnet Ethereum/Polygon; salvar `txHash`; provar integridade; não guardar dinheiro na blockchain.
