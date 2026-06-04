# Como Começar

## Pré-requisitos

| Ferramenta | Versão mínima | Link |
|------------|---------------|------|
| Node.js    | 20.x          | https://nodejs.org |
| pnpm       | 9.x           | https://pnpm.io |
| Docker     | 24.x          | https://docker.com |
| Docker Compose | v2.x     | incluído no Docker Desktop |

## Setup inicial

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Variáveis de ambiente

```bash
# Raiz (para docker-compose)
cp .env.example .env

# API
cp apps/api/.env.example apps/api/.env
```

Edite `apps/api/.env` e mude ao menos:
- `JWT_SECRET` — string aleatória de 64+ chars
- `JWT_REFRESH_SECRET` — outro secret diferente

### 3. Subir o banco de dados

```bash
pnpm docker:up
```

Aguarde o container ficar healthy:
```bash
docker ps  # deve mostrar "healthy" para selo_postgres
```

### 4. Gerar o Prisma Client

```bash
pnpm db:generate
```

### 5. Rodar migrações

```bash
pnpm db:migrate
# Quando perguntado sobre o nome da migration: "init"
```

### 6. Iniciar a API

```bash
pnpm dev:api
# API disponível em http://localhost:3000/api/v1
```

### 7. Testar a API

```bash
# Health check do admin
curl http://localhost:3000/api/v1/admin/health

# Criar conta
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@teste.com","password":"senha123!","fullName":"Teste"}'
```

### 8. Iniciar o mobile (outro terminal)

```bash
pnpm dev:mobile
# Escaneie o QR Code com Expo Go no celular
# Ou pressione 'a' para Android / 'i' para iOS
```

---

## Fluxo de desenvolvimento

### Adicionar uma migration Prisma

```bash
# Edite apps/api/prisma/schema.prisma
# Depois:
pnpm db:migrate
```

### Visualizar o banco com Prisma Studio

```bash
pnpm db:studio
# Abre em http://localhost:5555
```

### Criar um novo módulo NestJS

```bash
cd apps/api
npx nest g module modules/nome
npx nest g controller modules/nome
npx nest g service modules/nome
```

Lembre de:
1. Importar o módulo no `app.module.ts`
2. Criar DTOs em `modules/nome/dto/`
3. Adicionar ao `CLAUDE.md` se for um módulo novo

---

## Portas padrão

| Serviço    | Porta |
|------------|-------|
| API        | 3000  |
| Admin      | 3001  |
| PostgreSQL | 5432  |
| Prisma Studio | 5555 |
