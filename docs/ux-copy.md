# UX Copy — Linguagem Aprovada do Selo

> Criado na Fase 27. Define os termos aprovados para uso na interface do usuário comum e os termos proibidos.

---

## 1. Princípio

A linguagem do Selo na interface do usuário deve ser humana, clara e direta. Qualquer pessoa que nunca ouviu falar de fintech ou blockchain deve entender a UI sem precisar pesquisar no Google.

**Regra de ouro:** Se você precisaria explicar o termo antes de usá-lo, não use.

---

## 2. Termos Aprovados (UI do usuário comum)

| Termo aprovado | Contexto de uso |
|---|---|
| Combinado | Para referir a qualquer acordo registrado |
| Valor protegido | Para descrever dinheiro travado aguardando conclusão |
| Pagar com Pix | Para descrever o pagamento do acordo com garantia |
| Verificação financeira | Para o processo de KYC progressivo |
| Chave de Recebimento | Para o handle interno `@usuario` do Selo |
| Destino de recebimento | Para a chave Pix cadastrada para receber pagamentos |
| Contestação | Para o processo formal de disputa |
| Registros de prova | Para os registros imutáveis de eventos do combinado |
| Score de confiança | Para a pontuação de reputação do usuário |
| Ambiente de teste | Para indicar que é beta/sandbox |
| Acordo concluído | Para o status de combinado finalizado |
| Confirmação das duas partes | Para dupla confirmação |
| Acordo simples | Para combinados sem dinheiro |
| Acordo com garantia | Para combinados com valor protegido |
| Prazo | Para a data limite do combinado |
| Histórico | Para o log de eventos do combinado |

---

## 3. Termos Proibidos na UI do Usuário Comum

Estes termos não devem aparecer em telas, botões, textos ou mensagens de erro visíveis ao usuário comum:

| Termo proibido | Substituto aprovado |
|---|---|
| Escrow | Valor protegido |
| Blockchain | Registro de prova / histórico imutável |
| Smart contract | (não usar — não há smart contract de custódia) |
| Hash | Código de verificação / registro de prova |
| TxHash | Código de registro |
| Token | (não usar) |
| BaaS | (não usar) |
| KYC | Verificação financeira |
| Compliance | (não usar) |
| Provider | (não usar) |
| Webhook | (não usar) |
| Ledger | Histórico / registros |
| Custódia | Valor protegido |
| Liquidação | Liberação do valor / conclusão |
| Fiat | Reais / dinheiro |
| On-chain | Registro de prova |
| Off-chain | (não usar) |
| Testnet | (não usar para usuários comuns) |
| Mainnet | (não usar) |
| Wallet | Carteira / app Selo |
| Refund | Reembolso |
| Payout | Liberação do valor |
| SDK | (não usar) |

---

## 4. Tom de Voz

| Atributo | Descrição |
|---|---|
| Humano | Fala como uma pessoa, não como um sistema |
| Direto | Vai ao ponto. Sem rodeios. |
| Seguro | Transmite confiança sem prometer o que não pode cumprir |
| Neutro | Não é excessivamente informal nem formal demais |
| Claro | Prefere frases curtas. Uma ideia por frase. |

### Exemplos de tom aprovado

| Errado | Certo |
|---|---|
| "Escrow iniciado com sucesso." | "Valor protegido na plataforma." |
| "KYC necessário para esta operação." | "Para criar um combinado com garantia, precisamos verificar algumas informações financeiras." |
| "Blockchain record registered." | "Registro de prova criado." |
| "Hash canônico gerado via SHA-256." | "Registro de prova criado." |
| "Transação on-chain confirmada." | "Registro confirmado." |
| "Webhook recebido com sucesso." | (não exibir para o usuário) |
| "Aguardando liquidação." | "Aguardando liberação do valor." |

---

## 5. Mensagens de Status dos Combinados

| Status interno | Texto na UI |
|---|---|
| `PENDING` | "Aguardando aceite" |
| `ACTIVE` | "Em andamento" |
| `COMPLETED` | "Concluído" |
| `CANCELLED` | "Cancelado" |
| `REJECTED` | "Recusado" |
| `DISPUTED` | "Em contestação" |
| `EXPIRED` | "Expirado" |

---

## 6. Mensagens de Status Financeiro

| Status interno | Texto na UI |
|---|---|
| `NONE` | — (não exibir) |
| `AWAITING_PAYMENT` | "Aguardando pagamento" |
| `LOCKED` | "Valor protegido" |
| `RELEASED` | "Valor liberado" |
| `REFUNDED` | "Valor reembolsado" |

---

## 7. Mensagens de Status dos Registros de Prova

| Status interno | Texto na UI |
|---|---|
| `SUBMITTED` | "Registrado" |
| `CONFIRMED` | "Confirmado" |
| `PENDING` | "Processando" |
| `FAILED` | "Falha no registro" |

---

## 8. Mensagens de Status do Score de Confiança

| Nível interno | Texto na UI |
|---|---|
| `VERY_LOW` | Muito baixo |
| `LOW` | Baixo |
| `MEDIUM` | Em formação |
| `HIGH` | Alto |
| `VERY_HIGH` | Muito alto |
| `EXCELLENT` | Excelente |

---

## 9. Avisos de Ambiente de Teste

O banner de ambiente de teste deve aparecer em:

- Home Wallet (topo da área de conteúdo)
- Tutorial de onboarding (último slide)
- Perfil do usuário (rodapé da tela)
- Configurações (seção Beta Fechado)

Texto aprovado para o banner:

> **"Ambiente de teste — nenhum dinheiro real é movimentado."**

Variante compacta:

> **"Ambiente de teste."**

---

## 10. Textos de Estado Vazio

| Tela | Texto aprovado |
|---|---|
| Home sem combinados | "Nenhum combinado ainda. Crie seu primeiro combinado tocando no botão + abaixo." |
| Lista de combinados vazia | "Nenhum combinado encontrado." |
| Sem Chave de Recebimento | "Crie sua Chave de Recebimento para que outras pessoas possam criar acordos com você." |
| Sem destino de recebimento | "Cadastre um destino para receber valores em acordos com garantia." |
| Sem registros de prova | "Nenhum registro de prova ainda. Os registros aparecerão aqui após eventos relevantes do combinado." |

---

## 11. Textos de Erro Humanos

| Erro técnico | Mensagem aprovada |
|---|---|
| 401 / sessão expirada | "Sessão expirada. Faça login novamente." |
| 403 / sem permissão | "Você não tem permissão para esta ação." |
| 404 / não encontrado | "Não encontrado." |
| 500 / erro interno | "Serviço temporariamente indisponível. Tente novamente em instantes." |
| Network error | "Sem conexão com o servidor. Verifique sua internet." |
| KYC bloqueio | "Para criar um combinado com garantia, complete a verificação financeira primeiro." |
| Sem destino ativo | "O recebedor precisa ter um destino de recebimento ativo para acordos com garantia." |

---

## 12. Disclaimer da Central de Ajuda

> "O dinheiro não fica na blockchain. O registro de prova apenas prova que o evento aconteceu."

---

## 13. Versão Mobile e Admin

### Mobile (usuário comum)
Todos os textos devem seguir este documento rigorosamente.

### Admin (painel interno)
O admin pode usar termos técnicos quando necessário (ex: status, proofHash, txHash), desde que não exponha dados sensíveis (CPF cru, pixKey completa, tokens, private key).
