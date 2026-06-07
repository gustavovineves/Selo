# Beta Fechado — Selo

> Criado na Fase 27. Guia de operação do beta fechado do Selo.

---

## 1. Objetivo do Beta

O beta fechado do Selo tem dois objetivos principais:

1. **Validar a experiência do usuário** — fluxo de criação, aceite, pagamento e contestação de combinados.
2. **Identificar pontos de atrito** — linguagem confusa, etapas desnecessárias, comportamentos inesperados.

O beta **não é** um teste de escala. É um programa de qualidade com usuários reais e confiáveis, antes do lançamento com dinheiro real.

---

## 2. Perfil de Usuários Convidados

| Critério | Descrição |
|---|---|
| Tamanho do grupo | 10–30 pessoas por fase |
| Relação com o produto | Usuários que já lidam com acordos informais no dia a dia |
| Nível técnico | Qualquer — a interface deve funcionar para todos |
| Disposição | Disponíveis para testar os fluxos e dar feedback ativo |
| Confidencialidade | Convidados devem entender que o produto está em desenvolvimento |

---

## 3. Limitações do Beta

| Limitação | Detalhe |
|---|---|
| Nenhum dinheiro real | Todos os pagamentos são simulados. Nenhum Pix real acontece. |
| Verificação financeira simulada | O CPF não é validado externamente. KYC é simulado localmente. |
| Blockchain simulada | Os registros de prova são determinísticos, sem rede externa. |
| Sem suporte em tempo real | Suporte via e-mail / formulário de feedback apenas. |
| Sem integração bancária | Não há Fitbank, Open Finance ou conta bancária real. |
| Ambiente de teste | Dados podem ser apagados ou reiniciados entre fases do beta. |

---

## 4. O Que Testar

### 4.1 Fluxos obrigatórios

| Fluxo | Critério de sucesso |
|---|---|
| Cadastro | Usuário cria conta sem precisar de ajuda |
| Criação de Chave de Recebimento | Usuário entende o que é a chave e configura sem atrito |
| Criação de acordo simples | Fluxo fluido; prazo obrigatório funciona |
| Aceite/recusa de acordo | Contraparte aceita ou recusa e entende o resultado |
| Criação de acordo com garantia | Usuário entende o que é "valor protegido" |
| Verificação financeira | Usuário entende quando e por que é necessária |
| Pagamento simulado | Usuário entende que é um ambiente de teste |
| Confirmação de conclusão | Dupla confirmação libera o valor |
| Contestação formal | Usuário abre contestação e entende o processo |
| Resolução admin | Admin consegue resolver via painel |
| Consulta de registros de prova | Usuário entende o que é (sem jargão técnico) |
| Feedback pelo app | Usuário encontra e usa o formulário de feedback |

### 4.2 Fluxos secundários

- Perfil: editar nome, cidade.
- Chave: excluir e recriar.
- Destino: adicionar, editar, definir padrão.
- Notificações: verificar notificações in-app.
- Score de confiança: verificar atualização após acordos concluídos.

---

## 5. Perguntas de Feedback

Após cada sessão de teste, coletar as seguintes respostas (formulário ou entrevista):

1. O que você quis fazer primeiro ao abrir o app?
2. Algum termo causou confusão? Qual?
3. O fluxo de criação de combinado foi intuitivo?
4. Você entendeu o que é "valor protegido"?
5. A diferença entre Chave de Recebimento e destino de recebimento ficou clara?
6. O que significou "registro de prova" para você?
7. O aviso de "ambiente de teste" foi suficientemente claro?
8. O que você faria diferente se estivesse usando com dinheiro real?
9. Em que momento você sentiu mais insegurança?
10. O que te faria recomendar o Selo para um amigo?

---

## 6. Riscos Conhecidos

| Risco | Mitigação |
|---|---|
| Usuário confundir ambiente de teste com produção | Banner persistente na home e no tutorial |
| Usuário achar que dinheiro foi movimentado | Mensagem explícita: "Ambiente de teste — nenhum dinheiro real é movimentado" |
| Usuário não entender Chave de Recebimento vs destino | Textos revisados; Central de Ajuda disponível |
| Usuário não completar verificação financeira para garantia | Mensagem de bloqueio com botão para verificação |
| Dados do beta se tornarem stale | Avisar usuários com antecedência sobre resets de dados |
| Feedback não chegar ao time | Modal de feedback no app; e-mail de convite como canal alternativo |

---

## 7. Como Reportar Bug

1. **Pelo app:** Perfil → Enviar feedback do beta → Categoria: "Encontrei um problema".
2. **Por e-mail:** Responder o e-mail de convite do beta com descrição do problema.
3. **O que incluir:** Tela onde ocorreu, o que você estava tentando fazer, e o que aconteceu de inesperado.

---

## 8. Checklist Antes de Convidar Usuários

### Técnico

- [ ] API rodando sem crashes.
- [ ] Testes unitários: zero falhas.
- [ ] Testes E2E: zero falhas.
- [ ] Build da API: sucesso.
- [ ] Typecheck mobile: sucesso.
- [ ] Typecheck admin: sucesso.
- [ ] CI passando no GitHub Actions.
- [ ] `.env` real não commitado.
- [ ] Nenhuma private key no repositório.

### Produto

- [ ] Banner de beta visível na home.
- [ ] Tutorial com aviso de beta no último slide.
- [ ] Central de Ajuda acessível pelo perfil e configurações.
- [ ] Modal de feedback funcional.
- [ ] Mensagens de erro claras nas telas principais.
- [ ] Fluxo de verificação financeira testado.
- [ ] Criação de acordo com garantia testada end-to-end.
- [ ] Contestação testada (criar + resolver no admin).
- [ ] Registros de prova visíveis na tela de detalhe do acordo.

### Admin

- [ ] Painel admin acessível.
- [ ] Login admin funcional (AdminUser no banco).
- [ ] Disputas abertas aparecem no dashboard.
- [ ] Resolução de disputa (liberar e reembolsar) funcional.
- [ ] Listagem de usuários funcional.
- [ ] Listagem de acordos funcional.
- [ ] Consulta de registros de prova funcional.

---

## 9. Termos Que o Usuário Deve Entender

| Termo no app | O que significa |
|---|---|
| Combinado | Acordo registrado entre duas pessoas |
| Valor protegido | Dinheiro guardado na plataforma até ambas as partes confirmarem |
| Chave de Recebimento | Endereço no Selo para ser localizado (@handle) |
| Destino de recebimento | Chave Pix para onde o dinheiro vai quando liberado |
| Contestação | Processo formal para resolver desacordo; sem chat |
| Score de confiança | Histórico de comportamento em combinados |
| Verificação financeira | Processo para criar combinados com dinheiro envolvido |
| Registro de prova | Carimbo imutável provando que um evento aconteceu |
| Ambiente de teste | Tudo é simulado — nenhum dinheiro real é movimentado |

---

## 10. O Que Ainda É Simulado

| Funcionalidade | Status no Beta |
|---|---|
| Pagamento Pix | Simulado — nenhum Pix real |
| Verificação financeira (KYC) | Simulada — sem consulta externa |
| Registros de prova (blockchain) | Simulados — sem rede blockchain |
| Liberação de valor | Simulada — fluxo interno |
| Reembolso | Simulado — fluxo interno |

---

## 11. O Que Não Deve Ser Prometido

- **Não prometer** que o dinheiro está protegido de verdade em produção (ainda não está em beta).
- **Não prometer** que a blockchain é pública e verificável (é simulada).
- **Não prometer** data de lançamento.
- **Não prometer** que os dados do beta serão migrados para produção.
- **Não prometer** integração com banco do usuário.
- **Não prometer** notificações push reais (em beta, são in-app apenas).

---

## 12. Como Rodar o Beta em Staging

O beta fechado requer um ambiente de staging funcional antes de convidar usuários externos.

### 12.1 Número Inicial Recomendado de Usuários

| Fase do beta | Número de convidados | Objetivo |
|---|---|---|
| Fase 1 (piloto) | 5–10 | Validar fluxo técnico com usuários de confiança |
| Fase 2 (beta fechado) | 10–30 | Validar UX e identificar fricções |
| Fase 3 (beta ampliado) | 30–100 | Medir ativação e retenção |

### 12.2 Pré-requisitos Técnicos

Antes de convidar usuários, confirme o checklist completo em [docs/staging-checklist.md](staging-checklist.md).

Itens críticos:
- API rodando sem crashes em staging.
- AdminUser de staging criado e login funcional.
- Health retornando `"mode": "staging"`.
- HTTPS ativo.
- Todos os provedores em modo simulado.

### 12.3 Fluxos a Testar com Usuários Reais

Ver seção 4 deste documento (O Que Testar).

Prioridade máxima para o primeiro ciclo:
1. Cadastro sem CPF.
2. Configuração de Chave de Recebimento.
3. Criação e aceite de combinado simples.
4. Verificação financeira simulada.
5. Criação e pagamento de combinado com garantia (simulado).
6. Contestação e resolução admin.

### 12.4 Perguntas para os Convidados

Ver seção 5 deste documento (Perguntas de Feedback).

Canais de coleta:
- Modal de feedback no app (Perfil → Enviar feedback).
- E-mail de resposta ao convite do beta.
- Entrevista opcional (video call 30min) para usuários mais engajados.

### 12.5 Critérios de Sucesso do Beta

| Critério | Meta |
|---|---|
| Cadastro sem assistência | >80% dos convidados |
| Combinado simples criado | >70% dos convidados |
| Verificação financeira concluída | >50% dos que tentaram |
| Combinado com garantia criado | >30% dos convidados |
| Feedback enviado pelo app | >50% dos convidados |
| Zero crashes críticos reportados | Obrigatório |

### 12.6 Critérios para Bloquear o Beta

Suspender o beta imediatamente se:
- API em crash persistente (health retornando erro).
- AdminUser bloqueado (sem acesso ao painel admin).
- Dados de usuários sendo expostos indevidamente.
- Banco de dados corrompido.
- Erro que impeça cadastro ou login.

### 12.7 Como Registrar Bugs

**Pelo app:** Perfil → Enviar feedback → Categoria: "Encontrei um problema".

**Por e-mail:** Responder o e-mail de convite.

**O que incluir no relato:**
- Qual tela estava aberta.
- O que estava tentando fazer.
- O que aconteceu de inesperado (mensagem de erro, se houver).
- Dispositivo/sistema operacional.

### 12.8 Como Reportar Disputa Manual (Admin)

Durante o beta, disputas são resolvidas manualmente:
1. Acesse `https://admin.staging.selo.app`.
2. Seção "Contestações" no menu.
3. Selecione a disputa pelo ID do acordo.
4. Leia as evidências disponíveis.
5. Clique em "Liberar para recebedor" ou "Reembolsar pagador".

### 12.9 Limitações Explícitas do Beta

| Funcionalidade | Status |
|---|---|
| Pix real | ❌ Simulado — nenhum Pix real acontece |
| Dinheiro real | ❌ Não movimentado |
| KYC externo | ❌ Simulado — sem consulta a Serpro ou bureau |
| Blockchain real | ❌ Simulado — sem rede externa |
| Fitbank produção | ❌ Apenas sandbox simulado |
| Chat entre partes | ❌ Não implementado |
| Notificações push | ❌ Apenas in-app |
| Upload de avatar | ❌ Não implementado |
| Dados migrados para produção | ❌ Não garantido |

---

## 13. Próximos Passos Após o Beta

Ao concluir o beta fechado e coletar feedback suficiente:

1. **Analisar feedback** — priorizar correções urgentes de UX e bugs.
2. **Fase 29 — Beta Fechado Operacional:** Iterar sobre o feedback coletado, resolver fricções, medir ativação dos fluxos críticos.
3. **Decidir**: lançar beta público ou ir direto para produção financeira.
4. **Integração Fitbank real** (requer aprovação do Banco Central / parceiro BaaS).
5. **KYC real** (Serpro ou bureau de crédito aprovado).
6. **Pix real** (via BaaS).
