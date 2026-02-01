# Changelog - 2026-02-01_003

## Persistência do Grupo de Gerenciamento

### Problema
O grupo de gerenciamento configurado via comando `!instalar` não persistia após reiniciar o bot. O usuário precisava reconfigurar o grupo toda vez que o bot era reiniciado.

### Solução
Implementada persistência da configuração do grupo de gerenciamento no banco de dados SQLite.

### Arquivos Modificados

#### `src/services/database.ts`
- Adicionada função `getConfig(key: string)` para ler configurações do banco
- Adicionada função `setConfig(key: string, value: string)` para salvar configurações no banco
- Utiliza a tabela `config` já existente no schema

#### `src/handlers/messageHandler.ts`
- Atualizado comando `!instalar` para salvar o JID do grupo no banco de dados
- Importada função `setConfig` do database

#### `src/index.ts`
- Na conexão, verifica se existe um grupo salvo no banco de dados
- Se existir, restaura automaticamente o grupo de gerenciamento
- Simplificadas as mensagens de erro para orientar o uso do comando `!instalar`

### Comportamento Esperado
1. Usuário digita `!instalar` em um grupo
2. O bot configura o grupo E salva no banco de dados
3. Ao reiniciar o bot, ele automaticamente restaura o grupo salvo
4. Não é mais necessário reconfigurar após cada reinício
