# Checklist de Staging — Selo

> Criado na Fase 28. Use antes de convidar os primeiros usuários do beta fechado.

---

## 1. Checklist Técnico

### 1.1 Código e Testes

- [ ] `pnpm --filter @selo/api test` — **zero falhas**
- [ ] `pnpm --filter @selo/api test:e2e` — **zero falhas**
- [ ] `pnpm --filter @selo/api build` — **sucesso (exit 0)**
- [ ] `pnpm --filter @selo/mobile typecheck` — **sem erros**
- [ ] `pnpm --filter @selo/admin typecheck` — **sem erros**
- [ ] CI no GitHub Actions passando na branch `main`

### 1.2 Segredos e Configuração

- [ ] Nenhum arquivo `.env` real commitado no repositório
- [ ] Nenhuma `BLOCKCHAIN_PRIVATE_KEY` no repositório
- [ ] `git ls-files | grep -E '\.env$'` retorna apenas arquivos `.env.example`
- [ ] `JWT_SECRET`, `JWT_REFRESH_SECRET` e `ADMIN_JWT_SECRET` têm pelo menos 64 caracteres
- [ ] Os três secrets JWT são **diferentes entre si**
- [ ] `FITBANK_ENABLE_REAL_CALLS=false` confirmado nas variáveis de staging
- [ ] `KYC_ENABLE_REAL_CALLS=false` confirmado
- [ ] `BLOCKCHAIN_ENABLE_REAL_CALLS=false` confirmado

### 1.3 Banco de Dados

- [ ] Banco PostgreSQL de staging criado e isolado (não compartilha com dev ou produção)
- [ ] `DATABASE_URL` de staging configurada apenas no provedor (não no repo)
- [ ] Migrations aplicadas: `pnpm --filter @selo/api prisma:deploy`
- [ ] AdminUser criado via `pnpm create-admin` (com senha forte)
- [ ] Backup do banco configurado no provedor

### 1.4 API

- [ ] `GET https://api.staging.selo.app/api/v1/health` retorna `status: "ok"`
- [ ] Health retorna `env: "staging"` e `mode: "staging"`
- [ ] Health **não expõe** DATABASE_URL, JWT_SECRET ou qualquer secret
- [ ] HTTPS ativo no domínio da API
- [ ] CORS_ORIGINS configurado com domínios corretos (sem wildcard `*`)
- [ ] Rate limit ativo (RATE_LIMIT_TTL e RATE_LIMIT_MAX definidos)
- [ ] Logs sem CPF, sem token, sem pixKey completa

### 1.5 Admin Web

- [ ] `https://admin.staging.selo.app` acessível
- [ ] HTTPS ativo
- [ ] Login admin funcional com o AdminUser criado
- [ ] Dashboard de disputas carrega
- [ ] Lista de usuários carrega
- [ ] Lista de acordos carrega
- [ ] Consulta de registros de prova funcional

### 1.6 Mobile

- [ ] App configurado com `EXPO_PUBLIC_API_URL` apontando para staging
- [ ] Cadastro de novo usuário funcional
- [ ] Login funcional
- [ ] Home carrega com banner "Ambiente de teste"
- [ ] Criação de Chave de Recebimento funcional
- [ ] Criação de combinado simples funcional
- [ ] Criação de combinado com garantia funcional (após verificação financeira)
- [ ] Verificação financeira simulada funcional
- [ ] Pagamento simulado funcional
- [ ] Contestação funcional
- [ ] Central de Ajuda acessível
- [ ] Modal de feedback funcional

---

## 2. Checklist de Produto

### 2.1 Linguagem e UX

- [ ] Banner de beta visível na home
- [ ] Tutorial com 5 slides e aviso de beta no último slide
- [ ] Central de Ajuda acessível pelo perfil e configurações
- [ ] Mensagens de erro claras nas telas principais
- [ ] Nenhum termo técnico exposto ao usuário comum (ver [docs/ux-copy.md](ux-copy.md))
- [ ] "Valor protegido" explicado corretamente
- [ ] "Registro de prova" sem jargão blockchain

### 2.2 Fluxos Críticos Testados

- [ ] Fluxo completo: cadastro → Chave → combinado simples → aceite → conclusão
- [ ] Fluxo completo: verificação financeira → destino → combinado com garantia → pagamento simulado → conclusão
- [ ] Fluxo de contestação: abrir → admin resolve → valor liberado/reembolsado
- [ ] Registro de prova aparece após criação e aceitação do acordo

### 2.3 Avisos de Ambiente

- [ ] Usuários entendem que nenhum dinheiro real é movimentado
- [ ] Usuários entendem que o ambiente de teste pode ser reiniciado
- [ ] Canais de feedback informados (modal no app + e-mail de convite)

---

## 3. Checklist de Segurança

- [ ] Nenhuma rota admin acessível sem token JWT admin válido
- [ ] Token de usuário comum rejeitado nas rotas admin
- [ ] CPF não é pedido no cadastro inicial
- [ ] CPF mascarado onde exibido
- [ ] pixKey completa não exposta nos logs ou respostas
- [ ] Destino financeiro não exposto completamente
- [ ] Endpoint `/simulate-confirmation` funcional (apenas em ambiente de teste — não é bloqueado em staging pois staging ainda é simulado)
- [ ] `dueDate` obrigatório na criação de acordos
- [ ] Acordo com garantia exige destino de recebimento ativo

---

## 4. Checklist Pré-Convite

### 4.1 Antes de enviar convites

- [ ] Todos os itens técnicos acima confirmados
- [ ] Todos os itens de produto acima confirmados
- [ ] E-mail de convite preparado (inclui: link para download, aviso de ambiente de teste, canal de feedback)
- [ ] Lista de convidados definida (10–30 pessoas para a primeira fase)
- [ ] AdminUser de staging testado e funcional
- [ ] Fluxo de reportar bug documentado para os usuários

### 4.2 O que comunicar aos usuários

- [ ] "Você está em um beta fechado de teste."
- [ ] "Nenhum dinheiro real é movimentado."
- [ ] "Dados podem ser reiniciados entre fases do beta."
- [ ] "Seu feedback é essencial para melhorarmos o produto."
- [ ] "Use o formulário no app para reportar problemas."

---

## 5. Referências

| Documento | Descrição |
|---|---|
| [deploy-staging.md](deploy-staging.md) | Instruções completas de deploy |
| [beta.md](beta.md) | Guia operacional do beta fechado |
| [environments.md](environments.md) | Ambientes, variáveis e segurança |
| [ux-copy.md](ux-copy.md) | Linguagem aprovada no app |
| [tests.md](tests.md) | Como rodar os testes |
