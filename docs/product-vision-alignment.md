# Alinhamento ao Documento de Visão do Produto — Selo

> **Objetivo deste documento:** Servir como matriz de aderência técnica entre o documento de visão do produto Selo e o estado atual do código, testes e documentação. Não substitui o documento original de produto.
>
> **Atualizado em:** Fase 21 — Adequação Integral do Projeto ao Documento de Visão do Produto

---

## Princípios Inegociáveis do Produto

| Princípio | Implementado | Observação |
|---|---|---|
| "A carteira dos seus combinados" | ✅ | Frase pública usada no README e onboarding |
| Linguagem humana na UI do usuário comum | ✅ | "combinado", "valor protegido", "pagar com Pix", "contestar" |
| Ausência de jargão técnico na UI | ✅ | Sem "escrow", "blockchain", "hash", "token", "smart contract" |
| Disputa formal, sem chat livre | ✅ | Evidências formais — não há conversa entre partes |
| Resolução humana/administrativa | ✅ | Admin resolve via painel |
| Blockchain como prova, não custódia | ✅ | BlockchainRecord registra hash, não guarda dinheiro |
| Dinheiro com parceiro financeiro (Fitbank) | ✅ Preparado | Fitbank não integrado — simulado no MVP |
| Não tratar Chave de Recebimento como chave Pix | ✅ | Handle interno `@usuario`, separado de chave Pix |

---

## Matriz de Aderência — Funcionalidades do Produto

### 1. Acordo Simples

| Requisito do Documento | Estado Atual | Ação na Fase 21 |
|---|---|---|
| Criação de acordo entre duas pessoas | ✅ Implementado | — |
| Chave de Recebimento do App para localizar contraparte | ✅ Implementado | — |
| Prazo obrigatório com dia e horário | ✅ Implementado (Fase 18/19) | — |
| Histórico de eventos imutável | ✅ Implementado | — |
| Score de confiança atualizado no encerramento | ✅ Implementado (+20 para ambos) | — |
| Notificações in-app em cada evento | ✅ Implementado (Fase 14) | — |
| Cancelamento disponível até conclusão | ✅ Implementado | — |
| Recusa pelo destinatário | ✅ Implementado | — |
| ContentHash SHA256 gerado no backend | ✅ Implementado | — |
| BlockchainRecord registrado na criação | ❌ Não implementado | Implementado na Fase 21 |

### 2. Acordo com Garantia

| Requisito do Documento | Estado Atual | Ação na Fase 21 |
|---|---|---|
| Valor protegido na plataforma | ✅ Simulado (BaaS futuro) | — |
| Pagamento via Pix (simulado) | ✅ Implementado | — |
| Dupla confirmação para liberar valor | ✅ Implementado | — |
| Recebedor precisa de Destino de Recebimento ativo | ✅ Implementado | — |
| Snapshot do destino salvo no acordo | ✅ Implementado | — |
| Disputa trava o valor automaticamente | ✅ Implementado | — |
| BlockchainRecord registrado em eventos chave | ⚠️ Parcial (só payout/confirmação) | Expandido na Fase 21 |
| Onboarding financeiro progressivo ao criar com garantia | ❌ Não implementado | Preparado/documentado na Fase 21 |

### 3. Chave de Recebimento do App

| Requisito do Documento | Estado Atual | Ação na Fase 21 |
|---|---|---|
| Handle interno `@usuario` | ✅ Implementado | — |
| Separada de chave Pix | ✅ Implementado | — |
| Chave única ativa por usuário | ✅ Implementado | — |
| Handle excluído não pode ser reutilizado | ✅ Implementado (normalizedKey unique global) | — |
| Chave inativa/excluída bloqueada para novo acordo | ✅ Implementado | — |
| Snapshot salvo no acordo (imutável) | ✅ Implementado (receiverKeySnapshot) | — |
| Exclusão bloqueada com pendências | ✅ Implementado | — |
| Ambos os usuários devem ter chave para participar | ⚠️ Parcial | Documentado — criador não obrigado a ter chave; contraparte sim |
| Status: ACTIVE | ✅ Implementado | — |
| Status: PENDING_VALIDATION | ✅ No schema (PENDING_VALIDATION) | — |
| Status: QUARANTINED | ✅ No schema | — |
| Status: DELETED | ✅ Implementado | — |
| Status: INATIVA | ⚠️ Não existe no schema como INACTIVE | Mapeado: usar PENDING_VALIDATION ou QUARANTINED |
| Status: Bloqueada por segurança | ⚠️ Mapeado para QUARANTINED | Documentado |

### 4. Destino de Recebimento

| Requisito do Documento | Estado Atual | Ação na Fase 21 |
|---|---|---|
| Separado da Chave de Recebimento | ✅ Implementado | — |
| Serve para pagamento real futuro (Fitbank) | ✅ Preparado | — |
| Exibido mascarado para o usuário | ✅ Implementado | — |
| Travado/snapshotado em acordo com garantia | ✅ Implementado | — |
| Alteração não afeta acordos antigos | ✅ Implementado | — |
| Status: ACTIVE | ✅ Implementado | — |
| Status: DELETED | ✅ Implementado | — |
| Status: INACTIVE | ⚠️ Não existe no schema atual | Requer migration futura |
| Status: BLOCKED | ⚠️ Não existe no schema atual | Requer migration futura |
| Status: PENDING_VERIFICATION | ⚠️ Não existe no schema atual | Requer migration futura |

**Decisão:** Status adicionais (`INACTIVE`, `BLOCKED`, `PENDING_VERIFICATION`) para `ReceivingDestination` requerem migration. No MVP, ACTIVE e DELETED são suficientes. A documentação descreve a lacuna e o caminho de evolução.

### 5. Prazo Obrigatório

| Requisito do Documento | Estado Atual | Ação na Fase 21 |
|---|---|---|
| Prazo com dia E horário | ✅ Implementado (Fase 19) | — |
| Backend exige dueDate em ambos os tipos | ✅ Implementado (Fase 18) | — |
| UI mobile exige seleção explícita | ✅ Implementado | — |
| Acordo sem prazo falha com 400 | ✅ Coberto por E2E | — |
| Prazo exibido com hora na UI | ✅ Implementado (Fase 19/20) | — |
| Prazo não usa 23:59:59 automático | ✅ Usuário escolhe hora explicitamente | — |

### 6. Status Operacional

O schema possui `AgreementOperationalStatus`. Mapeamento ao documento de visão:

| Status do Documento | Status no Schema | Observação |
|---|---|---|
| Aguardando aceite | `AWAITING_ACCEPTANCE` | ✅ Exato |
| Aceito | `ACTIVE` | ✅ (aceite leva direto a ACTIVE) |
| Recusado | Usa `CANCELLED` + evento `REJECTED` | ⚠️ Sem status operacional dedicado. Diferenciado pelo evento |
| Expirado antes do aceite | `EXPIRED` | ⚠️ Enum existe; lógica de expiração automática não implementada — Fase futura |
| Ativo | `ACTIVE` | ✅ Exato |
| Concluído | `COMPLETED` | ✅ Exato |
| Cancelado | `CANCELLED` | ✅ Exato |
| Em disputa | Combinação: `financialStatus=DISPUTED` | ⚠️ Operacional permanece inalterado; disputa impacta só o eixo financeiro |
| Vencido | `EXPIRED` | ⚠️ Enum existe; expiração automática por `dueDate` passado não implementada — Fase futura |

**Decisão:** O schema já possui todos os status necessários. O estado "Em disputa" é representado pelo eixo `financialStatus = DISPUTED`, não pelo `operationalStatus` — decisão arquitetural correta (os dois eixos são independentes). A expiração automática por `dueDate` (EXPIRED) fica para uma fase futura (job agendado) sem alterar schema.

### 7. Status Financeiro

O schema possui `AgreementFinancialStatus`. Mapeamento ao documento de visão:

| Status do Documento | Status no Schema | Observação |
|---|---|---|
| Sem valor | `NONE` | ✅ Exato |
| Valor apenas registrado | `NONE` com `amount` preenchido | ⚠️ Não há status dedicado para "amount registrado sem garantia" |
| Aguardando depósito | `AWAITING_PAYMENT` | ✅ Exato |
| Depósito iniciado | `AWAITING_PAYMENT` (PaymentIntent criado) | ⚠️ Sem status intermediário; diferenciado pela existência do PaymentIntent |
| Depósito em processamento | `AWAITING_PAYMENT` (PixCharge ACTIVE) | ⚠️ Sem status intermediário no Agreement |
| Depósito falhou | `AWAITING_PAYMENT` (PaymentIntent FAILED) | ⚠️ Sem status dedicado; diferenciado pelo status do PaymentIntent |
| Pix confirmado / Valor protegido | `FUNDS_HELD` | ✅ Exato |
| Pagamento liberado | `PAID_OUT` | ✅ Exato |
| Reembolso pendente | `AWAITING_REFUND` | ✅ Enum existe; não usado ativamente no MVP |
| Reembolsado | `REFUNDED` | ✅ Exato |
| Travado por disputa | `DISPUTED` | ✅ Exato |
| Parcialmente liberado | Não existe no schema | ⚠️ Requer migration futura (fora do escopo MVP) |
| Expirado (financeiro) | Não existe no schema | ⚠️ Requer migration futura |
| Cancelado sem movimentação | `NONE` (quando accord simples cancela) | ✅ Funciona como esperado |

**Decisão:** Os status intermediários de depósito (iniciado, em processamento, falhou) são rastreados via `PaymentIntent.status` e `PixCharge.status`, não via `Agreement.financialStatus`. Esta é a arquitetura correta — o estado do Agreement só muda em marcos, não em cada passo do Pix. Parcialmente liberado e expirado financeiro ficam para fases com Fitbank real.

### 8. Onboarding Leve

| Requisito do Documento | Estado Atual | Ação na Fase 21 |
|---|---|---|
| Tela de boas-vindas "A carteira dos seus combinados" | ❌ Não implementado | **Implementado** |
| Opção Criar conta / Entrar | ❌ Não implementado | **Implementado** |
| Dados básicos (nome, e-mail) | ✅ Já na tela de cadastro | — |
| Criação da Chave de Recebimento do App no onboarding | ❌ Não implementado | **Implementado** |
| Mini tutorial (o que é um combinado) | ❌ Não implementado | **Implementado** |
| Chegada na home | ✅ Redireciona para home após cadastro | — |
| CPF não pedido no cadastro inicial | ✅ Não é pedido | — |
| KYC não implementado | ✅ Não implementado | — |

### 9. Onboarding Financeiro Progressivo

| Requisito do Documento | Estado Atual | Ação na Fase 21 |
|---|---|---|
| Aparece apenas ao tentar criar acordo com garantia | ❌ Mostra só erro 400 | **Preparado** (fluxo guiado de destino) |
| Explica em linguagem humana | ❌ | **Documentado** |
| Não pede CPF no cadastro inicial | ✅ | — |
| KYC real não implementado | ✅ | — |

### 10. Score de Confiança

| Requisito do Documento | Estado Atual | Ação na Fase 21 |
|---|---|---|
| Calculado a partir do histórico | ✅ Implementado (TrustScoreService) | — |
| Acordos concluídos (+20) | ✅ Implementado | — |
| Cancelamentos (-10) | ✅ Implementado | — |
| Disputas abertas (neutro, delta 0) | ✅ Implementado | — |
| Disputas ganhas (+30) | ✅ Implementado | — |
| Disputas perdidas (-20 MVP / -50 produção) | ✅ Implementado | — |
| Linguagem construtiva ("Em formação", "Histórico positivo") | ⚠️ Parcial | UI mostra nível, sem texto explicativo |
| Tela explicativa de score no perfil | ❌ Não implementado | **Implementado** |
| Não usa linguagem humilhante | ✅ Nenhum texto punitivo | — |

### 11. Busca Universal

| Requisito do Documento | Estado Atual | Ação na Fase 21 |
|---|---|---|
| Campo "Buscar acordos, pessoas ou chaves" | ❌ Não implementado | **Implementado (MVP)** |
| Busca em acordos carregados | ❌ | **Implementado** |
| Busca por chave (resolve endpoint) | ❌ | **Implementado** |
| Resultados agrupados | ❌ | **Implementado** |
| Empty state humano | ❌ | **Implementado** |
| Busca de ajuda | ❌ | Preparado/placeholder |

### 12. Configurações

| Requisito do Documento | Estado Atual | Ação na Fase 21 |
|---|---|---|
| Conta: editar nome | ✅ Via edit-profile | — |
| Conta: sair da conta | ✅ Implementado | — |
| Chave: ver/copiar/compartilhar/criar/excluir | ✅ Implementado (Fase 12) | — |
| Recebimento: configurar/editar/excluir destino | ✅ Implementado (Fase 12) | — |
| Segurança: logout explícito | ✅ Implementado | — |
| Segurança: sessões/dispositivos | ⚠️ Backend suporta (DeviceSession); UI não | Documentado como pendência |
| Privacidade: preferências básicas | ❌ | **Preparado (tela placeholder)** |
| Ajuda: termos de uso | ❌ | **Preparado (tela placeholder)** |
| Ajuda: regras de acordo com garantia | ⚠️ | **Preparado (tela com resumo)** |

### 13. Notificações In-App

| Requisito do Documento | Estado Atual | Ação na Fase 21 |
|---|---|---|
| Central de atividades | ✅ Implementado (Fase 14) | — |
| Badge de não lidas | ✅ Implementado | — |
| Notificações por evento de acordo | ✅ Implementado | — |
| Push notifications reais | ❌ Fora do escopo MVP | — |

### 14. Disputa Formal Sem Chat

| Requisito do Documento | Estado Atual | Ação na Fase 21 |
|---|---|---|
| Abertura formal da contestação | ✅ Implementado | — |
| Descrição e motivo obrigatórios | ✅ Implementado | — |
| Evidência pontual (não chat) | ✅ Implementado | — |
| Histórico formal de eventos | ✅ Implementado | — |
| Decisão administrativa | ✅ Implementado | — |
| Notas do sistema/admin | ✅ Implementado (RESOLUTION message) | — |
| Sem conversa livre entre partes | ✅ Sem chat bidirecional | — |
| UI não chama de "chat" ou "mensagens" | ✅ Usa "evidência", "registro formal" | — |

### 15. Blockchain como Camada de Prova

| Requisito do Documento | Estado Atual | Ação na Fase 21 |
|---|---|---|
| Arquitetura preparada | ✅ BlockchainRecord model existe | — |
| Hash do acordo gerado (contentHash) | ✅ SHA256 calculado na criação | — |
| BlockchainRecord.status = PENDING na criação | ❌ Só criado em payout/confirmação | **Implementado** |
| BlockchainRecord em aceite do acordo | ❌ | **Implementado** |
| BlockchainRecord em disputa aberta | ❌ | **Implementado** |
| BlockchainRecord em resolução admin | ✅ Implementado | — |
| Blockchain NÃO guarda dinheiro | ✅ Documentado | — |
| Integração com testnet real | ❌ Fase futura (Fase 26) | Documentado |
| UI não expõe "blockchain" ao usuário | ✅ Termo não aparece na UI | — |

### 16. Admin

| Requisito do Documento | Estado Atual | Ação na Fase 21 |
|---|---|---|
| Dashboard com estatísticas | ✅ Implementado (Fase 15) | — |
| Lista de disputas com filtros | ✅ Implementado | — |
| Detalhe da disputa completo | ✅ Implementado | — |
| Liberar valor simulado | ✅ Implementado | — |
| Reembolsar valor simulado | ✅ Implementado | — |
| Audit log em cada resolução | ✅ Implementado | — |
| JWT admin real (AdminUser) | ✅ Implementado (Fase 17) | — |
| Identificação do admin que decidiu | ✅ resolvedById, resolvedByType | — |
| Lista de usuários | ❌ | **Implementado** |
| Lista de acordos | ❌ | **Implementado** |
| Resolução automática por silêncio | ❌ | ✅ Não implementado (correto) |

---

## O Que Foi Implementado na Fase 21

| Item | Descrição |
|---|---|
| `docs/product-vision-alignment.md` | Este documento — matriz de aderência completa |
| Onboarding leve (mobile) | 3 telas: boas-vindas, configuração da chave, mini tutorial |
| Busca universal MVP (mobile) | Tela de busca por acordos e chaves |
| Score de confiança — tela explicativa (mobile) | Tela com pontuação, nível, fatores e histórico |
| Configurações melhoradas (mobile) | Seções: Segurança, Privacidade, Ajuda |
| BlockchainRecord em criação e aceite | Backend registra PENDING na criação e aceitação do acordo |
| BlockchainRecord em disputa aberta | Backend registra PENDING quando disputa é aberta |
| Admin: lista de usuários | `GET /admin/users` com paginação e filtros |
| Admin: lista de acordos | `GET /admin/agreements` com paginação e filtros |

---

## O Que Está Simulado no MVP

| Item | Por que simulado | Quando será real |
|---|---|---|
| Pix (depósito, payout, refund) | Fitbank não integrado | Fase 24 (Fitbank Sandbox) |
| Webhook de confirmação Pix | Depende de BaaS real | Fase 24 |
| Validação de chave Pix com Banco Central | Depende de integração DICT | Fase 24 |
| Custódia real do valor | Fitbank responsável — não plataforma | Fase 24 |
| Blockchain testnet | Requer configuração de rede e carteira | Fase 26 |
| KYC (CPF, Banco Central) | Fase 25 | Fase 25 |
| Push notifications reais | Expo Notifications + servidor de push | Fase 27 |

---

## O Que Depende de Fitbank Real (Fase 24)

- `POST /payments/:id/simulate-confirmation` → substituir por webhook real
- Geração de QR Code Pix real
- Payout real ao recebedor
- Refund real ao pagador
- Validação de `pixKey` com o DICT/Banco Central
- `PixCharge.pixKey` deixa de ser `SELO-PLATFORM@DEV.LOCAL`
- `provider: "SIMULATED"` no snapshot → `provider: "FITBANK"`

---

## O Que Depende de Blockchain Real (Fase 26)

- `BlockchainRecord.status` vai de `PENDING` para `SUBMITTED` → `CONFIRMED`
- `txHash` e `blockNumber` preenchidos após confirmação on-chain
- Rede: Ethereum Testnet (Sepolia) ou Polygon Testnet (Mumbai/Amoy)
- Prova exibida no app como "Acordo registrado em blockchain" com txHash truncado

---

## O Que Depende de KYC Real (Fase 25)

- CPF solicitado apenas quando necessário (criar acordo com garantia ou receber)
- Validação via parceiro KYC aprovado pelo Banco Central
- `User.kycStatus` atualizado após aprovação
- `User.document` e `documentType` preenchidos
- Limites financeiros por nível de verificação

---

## Mapeamento Técnico: Chave de Recebimento do App

A Chave de Recebimento do App usa `ReceivingKeyType.RANDOM` no schema atual por ser a opção semanticamente mais próxima de um handle interno. Em fases futuras, avaliar adicionar `APP_HANDLE` ao enum (requer migration).

**Semântica:**
- `@usuario` = identificador único do usuário dentro da plataforma Selo
- Não é transmitida ao Pix/DICT
- Não é validada com o Banco Central
- Serve exclusivamente para localização de usuário dentro do app

---

## Mapeamento Técnico: Status de Disputa na UI do Usuário

| Status interno (`DisputeStatus`) | Exibido ao usuário |
|---|---|
| `OPEN` | "Contestação aberta — aguardando análise" |
| `UNDER_REVIEW` | "Sendo analisada" (futuro) |
| `AWAITING_EVIDENCE` | "Aguardando evidências" (futuro) |
| `RESOLVED_FAVOR_CREATOR` | "Contestação resolvida — valor reembolsado ao pagador" |
| `RESOLVED_FAVOR_COUNTERPART` | "Contestação resolvida — valor liberado ao recebedor" |
| `WITHDRAWN` | "Contestação encerrada" |
| `CLOSED` | "Contestação encerrada" |

---

## Limitações Restantes após Fase 21

| Limitação | Plano |
|---|---|
| Expiração automática por dueDate passado | Job agendado (cron) — Fase futura |
| Status INACTIVE para ReceivingDestination | Migration — Fase futura |
| Status EXPIRED financeiro | Migration — Fase futura |
| Criador não obrigado a ter Chave de Recebimento | Decisão de produto: contraparte localiza criador por user ID, não por handle |
| Sessões/dispositivos no painel admin | Implementação futura no admin |
| Upload de arquivo como evidência | Fase futura (S3/storage) |
| Push notifications reais | Fase 27 |
| Biometria/PIN no app | Fase 27 |
| Animações de transição | Fase 27 |
| Upload de avatar | Fase 27 |

---

## Próximos Passos (Fases 22–27)

| Fase | Descrição |
|---|---|
| **Fase 22** | CI/GitHub Actions — testes automáticos em cada PR/push |
| **Fase 23** | Ambientes e Segurança — staging isolado, secrets management, rate limit, CORS |
| **Fase 24** | Fitbank Sandbox / Pix Sandbox — substituir `simulate-confirmation` por webhook real |
| **Fase 25** | KYC Progressivo — CPF, validação Banco Central, limites por nível |
| **Fase 26** | Blockchain Testnet — registro de hash em Ethereum/Polygon testnet real |
| **Fase 27** | UX Final e Beta Fechado — animações, avatar, polish, onboarding final, beta real |
