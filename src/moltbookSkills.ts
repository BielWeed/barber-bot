/**
 * Moltbook Skills Registry for Barber Bot Development
 * Este arquivo mapeia habilidades do Moltbook relevantes para o desenvolvimento do bot
 */

export interface MoltbookSkill {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  useCases: string[];
  priority: number;
}

// Habilidades do Moltbook organizadas por categoria
export const MOLTBOOK_SKILLS: MoltbookSkill[] = [
  // Categoria: WhatsApp/Messaging
  {
    id: 'whatsapp-baileys',
    name: 'WhatsApp Baileys Integration',
    description: 'Biblioteca Node.js para conectar no WhatsApp Web via WebSocket',
    category: 'Messaging',
    tags: ['whatsapp', 'baileys', 'messaging', 'bot'],
    useCases: ['Conexão QR code', 'Envio de mensagens', 'Grupos'],
    priority: 10
  },
  {
    id: 'whatsapp-buttons',
    name: 'WhatsApp Interactive Buttons',
    description: 'Botões interativos nas mensagens do WhatsApp',
    category: 'Messaging',
    tags: ['whatsapp', 'buttons', 'interactive', 'ui'],
    useCases: ['Menus interativos', 'Confirmações', 'Seleção'],
    priority: 9
  },
  {
    id: 'message-templates',
    name: 'Message Templates',
    description: 'Sistema de templates de mensagens pré-definidos',
    category: 'Messaging',
    tags: ['templates', 'messaging', 'i18n', 'localization'],
    useCases: ['Mensagens padronizadas', 'Tradução', 'Formatação'],
    priority: 8
  },

  // Categoria: Database
  {
    id: 'sqljs',
    name: 'SQLite with sql.js',
    description: 'Banco de dados SQLite embarcado em JavaScript',
    category: 'Database',
    tags: ['sqlite', 'database', 'embedded', 'sql'],
    useCases: ['Armazenamento local', 'Persistência', 'Queries SQL'],
    priority: 10
  },
  {
    id: 'database-migration',
    name: 'Database Migration',
    description: 'Sistema de migrações de banco de dados',
    category: 'Database',
    tags: ['migration', 'database', 'schema', 'versioning'],
    useCases: ['Atualizações de schema', 'Versionamento', 'Backups'],
    priority: 7
  },
  {
    id: 'caching',
    name: 'Caching Layer',
    description: 'Camada de cache para otimização de performance',
    category: 'Database',
    tags: ['cache', 'performance', 'optimization', 'redis'],
    useCases: ['Cache de queries', 'Sessões', 'Rate limiting'],
    priority: 6
  },

  // Categoria: Scheduling
  {
    id: 'appointment-system',
    name: 'Appointment Scheduling System',
    description: 'Sistema completo de agendamento de horários',
    category: 'Scheduling',
    tags: ['scheduling', 'appointment', 'calendar', 'booking'],
    useCases: ['Agendamentos', 'Disponibilidade', 'Conflitos'],
    priority: 10
  },
  {
    id: 'ical-sync',
    name: 'iCal Integration',
    description: 'Sincronização com Google Calendar e Apple Calendar',
    category: 'Scheduling',
    tags: ['ical', 'calendar', 'sync', 'google'],
    useCases: ['Exportar horários', 'Sincronização', 'Lembretes'],
    priority: 5
  },
  {
    id: 'recurring',
    name: 'Recurring Appointments',
    description: 'Suporte para agendamentos recorrentes',
    category: 'Scheduling',
    tags: ['recurring', 'cron', 'schedule', 'repeat'],
    useCases: ['Clientes fixos', 'Planos mensais', 'Pacotes'],
    priority: 6
  },

  // Categoria: Finance
  {
    id: 'pix-payment',
    name: 'PIX Payment Integration',
    description: 'Integração com PIX para pagamentos instantâneos',
    category: 'Finance',
    tags: ['pix', 'payment', 'brazil', 'banking'],
    useCases: ['Recebimento de pagamentos', 'QR Code PIX', 'Transações'],
    priority: 9
  },
  {
    id: 'financial-reports',
    name: 'Financial Reports',
    description: 'Relatórios financeiros detalhados e dashboards',
    category: 'Finance',
    tags: ['reports', 'finance', 'dashboard', 'analytics'],
    useCases: ['Fluxo de caixa', 'Receitas', 'Despesas'],
    priority: 8
  },
  {
    id: 'invoice-gen',
    name: 'Invoice Generation',
    description: 'Geração automática de notas fiscais e recibos',
    category: 'Finance',
    tags: ['invoice', 'nfse', 'receipt', 'tax'],
    useCases: ['Nota fiscal', 'Recibo', 'Comprovante'],
    priority: 7
  },

  // Categoria: DevOps
  {
    id: 'docker',
    name: 'Docker Containerization',
    description: 'Containerização da aplicação com Docker',
    category: 'DevOps',
    tags: ['docker', 'container', 'devops', 'deployment'],
    useCases: ['Deploy', 'Isolamento', 'Escalabilidade'],
    priority: 9
  },
  {
    id: 'cicd',
    name: 'CI/CD Pipeline',
    description: 'Pipeline de integração e entrega contínua',
    category: 'DevOps',
    tags: ['ci/cd', 'github', 'actions', 'automation'],
    useCases: ['Build automatizado', 'Testes', 'Deploy'],
    priority: 8
  },
  {
    id: 'error-monitoring',
    name: 'Error Monitoring',
    description: 'Monitoramento de erros em tempo real',
    category: 'DevOps',
    tags: ['monitoring', 'errors', 'sentry', 'logging'],
    useCases: ['Debug', 'Alertas', 'Health checks'],
    priority: 9
  },
  {
    id: 'logging',
    name: 'Structured Logging',
    description: 'Sistema de logs estruturado e pesquisável',
    category: 'DevOps',
    tags: ['logging', 'logs', 'pino', 'structured'],
    useCases: ['Debug', 'Auditoria', 'Análise'],
    priority: 7
  },

  // Categoria: CRM
  {
    id: 'crm-basic',
    name: 'Basic CRM',
    description: 'Sistema de gestão de relacionamento com clientes',
    category: 'CRM',
    tags: ['crm', 'customer', 'client', 'relationship'],
    useCases: ['Cadastro', 'Histórico', 'Contatos'],
    priority: 9
  },
  {
    id: 'loyalty-program',
    name: 'Loyalty Program',
    description: 'Programa de fidelidade para clientes',
    category: 'CRM',
    tags: ['loyalty', 'points', 'rewards', 'discount'],
    useCases: ['Pontos', 'Descontos', 'Prêmios'],
    priority: 6
  },
  {
    id: 'customer-analytics',
    name: 'Customer Analytics',
    description: 'Análise de comportamento e preferências',
    category: 'CRM',
    tags: ['analytics', 'customer', 'insights', 'behavior'],
    useCases: ['Segmentação', 'Preferências', 'Recomendações'],
    priority: 5
  },

  // Categoria: Security
  {
    id: 'input-validation',
    name: 'Input Validation',
    description: 'Validação e sanitização de entrada de dados',
    category: 'Security',
    tags: ['validation', 'sanitization', 'security', 'xss'],
    useCases: ['Proteção XSS', 'SQL Injection', 'Dados válidos'],
    priority: 9
  },
  {
    id: 'session-auth',
    name: 'Session Management',
    description: 'Gerenciamento de sessões e autenticação',
    category: 'Security',
    tags: ['session', 'auth', 'token', 'security'],
    useCases: ['JWT', 'Sessões', 'Tokens'],
    priority: 8
  },

  // Categoria: Notifications
  {
    id: 'reminders',
    name: 'Appointment Reminders',
    description: 'Sistema de lembretes automáticos',
    category: 'Notifications',
    tags: ['reminder', 'notification', 'schedule', 'alert'],
    useCases: ['Lembretes 24h', 'Confirmations', ' follow-up'],
    priority: 8
  },
  {
    id: 'push-notifications',
    name: 'Push Notifications',
    description: 'Notificações push para dispositivos móveis',
    category: 'Notifications',
    tags: ['push', 'notification', 'mobile', 'firebase'],
    useCases: ['Alertas', 'Updates', 'Marketing'],
    priority: 5
  }
];

// Mapeamento de palavras-chave em português para habilidades
export const KEYWORD_TO_SKILLS: { [key: string]: string[] } = {
  'whatsapp': ['whatsapp-baileys', 'whatsapp-buttons', 'message-templates'],
  'mensagem': ['whatsapp-baileys', 'message-templates', 'whatsapp-buttons'],
  'bot': ['whatsapp-baileys', 'error-monitoring', 'logging'],
  'agendamento': ['appointment-system', 'ical-sync', 'recurring', 'reminders'],
  'horario': ['appointment-system', 'ical-sync', 'recurring'],
  'banco': ['sqljs', 'database-migration', 'caching'],
  'dados': ['sqljs', 'database-migration', 'caching'],
  'financeiro': ['pix-payment', 'financial-reports', 'invoice-gen'],
  'pagamento': ['pix-payment', 'financial-reports'],
  'dinheiro': ['pix-payment', 'financial-reports', 'invoice-gen'],
  'cliente': ['crm-basic', 'customer-analytics', 'loyalty-program'],
  'cadastro': ['crm-basic', 'customer-analytics'],
  'erro': ['error-monitoring', 'logging', 'input-validation'],
  'problema': ['error-monitoring', 'logging', 'input-validation'],
  'debug': ['error-monitoring', 'logging'],
  'deploy': ['docker', 'cicd', 'error-monitoring'],
  'produção': ['docker', 'cicd', 'error-monitoring'],
  'servidor': ['docker', 'cicd', 'error-monitoring'],
  'seguranca': ['input-validation', 'session-auth'],
  'validacao': ['input-validation'],
  'lembrete': ['reminders', 'push-notifications'],
  'notificacao': ['reminders', 'push-notifications'],
  'relatorio': ['financial-reports', 'customer-analytics'],
  'analise': ['customer-analytics', 'financial-reports'],
  'cache': ['caching'],
  'performance': ['caching', 'sqljs'],
  'otimizacao': ['caching', 'sqljs']
};

// Função para buscar habilidades por palavra-chave
export function getSkillsForKeyword(keyword: string): MoltbookSkill[] {
  const skillIds = KEYWORD_TO_SKILLS[keyword.toLowerCase()] || [];
  return skillIds
    .map(id => MOLTBOOK_SKILLS.find(s => s.id === id))
    .filter((s): s is MoltbookSkill => s !== undefined);
}

// Função para buscar habilidades por contexto
export function getSkillsForContext(context: string): MoltbookSkill[] {
  const contextLower = context.toLowerCase();
  const relevantSkills: MoltbookSkill[] = [];

  for (const [keyword, skillIds] of Object.entries(KEYWORD_TO_SKILLS)) {
    if (contextLower.includes(keyword)) {
      for (const skillId of skillIds) {
        const skill = MOLTBOOK_SKILLS.find(s => s.id === skillId);
        if (skill && !relevantSkills.find(s => s.id === skill.id)) {
          relevantSkills.push(skill);
        }
      }
    }
  }

  // Sort by priority
  return relevantSkills.sort((a, b) => b.priority - a.priority);
}

// Função para formatar habilidades para resposta
export function formatSkillsForResponse(skills: MoltbookSkill[]): string {
  if (skills.length === 0) {
    return '';
  }

  let response = '\n\n---\n';
  response += '💡 *Habilidades do Moltbook relevantes:*\n\n';

  for (const skill of skills.slice(0, 3)) {
    response += `🔹 *${skill.name}*\n`;
    response += `   └─ ${skill.description}\n`;
    response += `   └─ Tags: ${skill.tags.join(', ')}\n\n`;
  }

  return response;
}

// Exportar todas as habilidades
export default MOLTBOOK_SKILLS;
