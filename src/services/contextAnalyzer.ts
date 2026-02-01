/**
 * Context-aware skill discovery for the barber bot
 * Analyzes Portuguese messages and suggests relevant capabilities
 */

import { MoltbookService, getMoltbookService } from './moltbook';

interface SkillRecommendation {
  name: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  applicability: number; // 0-1 score
}

interface ContextAnalysis {
  keywords: string[];
  intents: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  topic: string;
}

// Context keywords mapping
const CONTEXT_KEYWORDS: { [key: string]: string[] } = {
  ' ['scheduling',agendamento': 'appointment', 'booking', 'calendar'],
  'horario': ['time', 'schedule', 'availability', 'slots'],
  'whatsapp': ['messaging', 'whatsapp', 'baileys', 'chat'],
  'bot': ['automation', 'bot', 'ai', 'assistant'],
  'barbearia': ['barber', 'salon', 'haircut', 'grooming'],
  'cliente': ['customer', 'client', 'user', 'contact'],
  'financeiro': ['payment', 'money', 'income', 'expense', 'pix'],
  'banco': ['database', 'sqlite', 'storage', 'persist'],
  'mensagem': ['message', 'text', 'response', 'reply'],
  'grupo': ['group', 'team', 'multiuser'],
  'servico': ['service', 'product', 'offering'],
  'erro': ['error', 'bug', 'issue', 'problem', 'fix'],
  'problema': ['issue', 'troubleshoot', 'debug'],
  'deploy': ['production', 'hosting', 'deploy', 'server'],
  'api': ['integration', 'external', 'webhook'],
  'qrcode': ['auth', 'login', 'session'],
  'conexao': ['connection', 'socket', 'reconnect'],
  'lembrete': ['notification', 'reminder', 'alert'],
  'relatorio': ['report', 'analytics', 'dashboard'],
  'config': ['settings', 'config', 'environment'],
  'teste': ['testing', 'unit', 'integration'],
  'perf': ['performance', 'optimization', 'speed'],
  'seguranca': ['security', 'validation', 'sanitize'],
  'traducao': ['i18n', 'localization', 'translation', 'portuguese']
};

// Intent patterns
const INTENT_PATTERNS: { [key: string]: RegExp[] } = {
  'add_feature': [/adicionar/i, /criar/i, /novo/i, /implementar/i, /incluir/i, /gostaria/i],
  'fix_bug': [/erro/i, /problema/i, /bug/i, /não funciona/i, /falha/i, /corrigir/i],
  'improve': [/melhorar/i, /otimizar/i, /melhor/i, /upgrade/i, /refatorar/i],
  'question': [/como/i, /o que/i, /qual/i, /porque/i, /por que/i, /posso/i],
  'deploy': [/deploy/i, /produção/i, /server/i, /hospedar/i, /colocar no ar/i],
  'integrate': [/integrar/i, /conectar/i, /api/i, /webhook/i, /vincular/i],
  'configure': [/configurar/i, /definir/i, /alterar/i, /mudar/i, /ajustar/i],
  'analyze': [/analisar/i, /verificar/i, /checar/i, /revisar/i, /auditar/i]
};

export class ContextAnalyzer {
  private moltbookService: MoltbookService;

  constructor() {
    this.moltbookService = getMoltbookService();
  }

  /**
   * Analyze user message and extract context
   */
  analyzeContext(message: string): ContextAnalysis {
    const normalizedMessage = message.toLowerCase();

    // Extract keywords
    const keywords = this.extractKeywords(normalizedMessage);

    // Detect intents
    const intents = this.detectIntents(normalizedMessage);

    // Analyze sentiment
    const sentiment = this.analyzeSentiment(normalizedMessage);

    // Determine main topic
    const topic = this.detectTopic(keywords, intents);

    return {
      keywords,
      intents,
      sentiment,
      topic
    };
  }

  /**
   * Extract relevant keywords from message
   */
  private extractKeywords(message: string): string[] {
    const foundKeywords: string[] = [];

    for (const [category, words] of Object.entries(CONTEXT_KEYWORDS)) {
      for (const word of words) {
        if (message.includes(word)) {
          foundKeywords.push(category);
          break;
        }
      }
    }

    return [...new Set(foundKeywords)];
  }

  /**
   * Detect user intents from message
   */
  private detectIntents(message: string): string[] {
    const detectedIntents: string[] = [];

    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          detectedIntents.push(intent);
          break;
        }
      }
    }

    // Default to 'question' if no intent detected
    if (detectedIntents.length === 0) {
      detectedIntents.push('question');
    }

    return detectedIntents;
  }

  /**
   * Analyze sentiment of message
   */
  private analyzeSentiment(message: string): 'positive' | 'neutral' | 'negative' {
    const positivePatterns = [/bom/i, /bastante/i, /funcionando/i, /ótimo/i, /excelente/i, /amei/i];
    const negativePatterns = [/erro/i, /problema/i, /bug/i, /ruim/i, /falha/i, /não funciona/i, /parou/i];

    for (const pattern of negativePatterns) {
      if (pattern.test(message)) return 'negative';
    }

    for (const pattern of positivePatterns) {
      if (pattern.test(message)) return 'positive';
    }

    return 'neutral';
  }

  /**
   * Detect main topic from keywords and intents
   */
  private detectTopic(keywords: string[], intents: string[]): string {
    if (intents.includes('fix_bug')) return 'bug_fix';
    if (intents.includes('deploy')) return 'deployment';
    if (intents.includes('add_feature')) return 'feature_request';
    if (intents.includes('improve')) return 'improvement';
    if (intents.includes('integrate')) return 'integration';

    // Prioritize by keyword count
    const priorityOrder = [
      'agendamento', 'financeiro', 'whatsapp', 'cliente',
      'banco', 'mensagem', 'grupo', 'servico'
    ];

    for (const topic of priorityOrder) {
      if (keywords.includes(topic)) return topic;
    }

    return 'general';
  }

  /**
   * Get skill recommendations based on context analysis
   */
  async getRecommendations(message: string): Promise<SkillRecommendation[]> {
    const context = this.analyzeContext(message);
    const recommendations: SkillRecommendation[] = [];

    // Map context to skill recommendations
    const skillMappings: { [key: string]: SkillRecommendation[] } = {
      'agendamento': [
        { name: 'iCal Integration', description: 'Sincronização com Google Calendar e Apple Calendar', category: 'Scheduling', priority: 'medium', applicability: 0.85 },
        { name: 'Recurring Appointments', description: 'Suporte para agendamentos recorrentes', category: 'Scheduling', priority: 'medium', applicability: 0.80 },
        { name: 'Timezone Handling', description: 'Gerenciamento automático de fusos horários', category: 'Scheduling', priority: 'low', applicability: 0.70 }
      ],
      'financeiro': [
        { name: 'Pix Payment', description: 'Integração com Pix para pagamentos', category: 'Finance', priority: 'high', applicability: 0.90 },
        { name: 'Invoice Generation', description: 'Geração automática de notas fiscais', category: 'Finance', priority: 'medium', applicability: 0.75 },
        { name: 'Financial Reports', description: 'Relatórios financeiros detalhados', category: 'Finance', priority: 'medium', applicability: 0.80 }
      ],
      'whatsapp': [
        { name: 'Message Templates', description: 'Templates de mensagens pré-definidos', category: 'Messaging', priority: 'high', applicability: 0.85 },
        { name: 'Interactive Buttons', description: 'Botões interativos nas mensagens', category: 'Messaging', priority: 'high', applicability: 0.90 },
        { name: 'Media Handling', description: 'Envio de imagens e documentos', category: 'Messaging', priority: 'medium', applicability: 0.75 }
      ],
      'cliente': [
        { name: 'CRM Integration', description: 'Sistema de gestão de relacionamento', category: 'CRM', priority: 'high', applicability: 0.85 },
        { name: 'Loyalty Program', description: 'Programa de fidelidade para clientes', category: 'CRM', priority: 'medium', applicability: 0.70 },
        { name: 'Customer Analytics', description: 'Análise de comportamento do cliente', category: 'Analytics', priority: 'low', applicability: 0.65 }
      ],
      'banco': [
        { name: 'Database Migration', description: 'Ferramentas de migração de banco', category: 'Database', priority: 'medium', applicability: 0.70 },
        { name: 'Backup Automation', description: 'Backup automático do banco', category: 'Database', priority: 'high', applicability: 0.85 }
      ],
      'grupo': [
        { name: 'Group Broadcast', description: 'Mensagens broadcast para grupos', category: 'Messaging', priority: 'medium', applicability: 0.80 },
        { name: 'Role Management', description: 'Gerenciamento de papéis no grupo', category: 'Group', priority: 'medium', applicability: 0.75 }
      ],
      'erro': [
        { name: 'Error Monitoring', description: 'Monitoramento de erros em tempo real', category: 'DevOps', priority: 'high', applicability: 0.90 },
        { name: 'Logging System', description: 'Sistema de logs estruturado', category: 'DevOps', priority: 'high', applicability: 0.85 },
        { name: 'Health Checks', description: 'Verificações de saúde do sistema', category: 'DevOps', priority: 'medium', applicability: 0.75 }
      ],
      'deploy': [
        { name: 'Docker Container', description: 'Containerização com Docker', category: 'DevOps', priority: 'high', applicability: 0.90 },
        { name: 'CI/CD Pipeline', description: 'Pipeline de CI/CD automático', category: 'DevOps', priority: 'high', applicability: 0.85 },
        { name: 'Cloud Deployment', description: 'Deploy em cloud (AWS/GCP/Azure)', category: 'DevOps', priority: 'medium', applicability: 0.75 }
      ]
    };

    // Get recommendations based on detected keywords
    for (const keyword of context.keywords) {
      if (skillMappings[keyword]) {
        recommendations.push(...skillMappings[keyword]);
      }
    }

    // Add context-specific recommendations
    if (context.sentiment === 'negative' && context.intents.includes('fix_bug')) {
      recommendations.push({
        name: 'Bug Reporting',
        description: 'Sistema de relatórios de bugs automático',
        category: 'DevOps',
        priority: 'high',
        applicability: 0.85
      });
    }

    if (context.topic === 'performance' || context.keywords.includes('perf')) {
      recommendations.push({
        name: 'Caching Layer',
        description: 'Camada de cache para otimização',
        category: 'Performance',
        priority: 'high',
        applicability: 0.80
      });
    }

    // Remove duplicates and sort by applicability
    const uniqueRecommendations = recommendations.filter((rec, index, self) =>
      index === self.findIndex(r => r.name === rec.name)
    );

    uniqueRecommendations.sort((a, b) => {
      // Sort by priority first, then by applicability
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.applicability - a.applicability;
    });

    return uniqueRecommendations.slice(0, 5);
  }

  /**
   * Format recommendations for display
   */
  formatRecommendations(recommendations: SkillRecommendation[]): string {
    if (recommendations.length === 0) {
      return '';
    }

    let formatted = '\n\n---\n';
    formatted += '💡 *Sugestões de habilidades para o bot:*\n\n';

    for (const rec of recommendations) {
      const priorityEmoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      formatted += `${priorityEmoji} *${rec.name}*\n`;
      formatted += `   └─ ${rec.description}\n`;
      formatted += `   └─ Categoria: ${rec.category} | Relevância: ${Math.round(rec.applicability * 100)}%\n\n`;
    }

    return formatted;
  }
}

// Singleton instance
let contextAnalyzer: ContextAnalyzer | null = null;

export function getContextAnalyzer(): ContextAnalyzer {
  if (!contextAnalyzer) {
    contextAnalyzer = new ContextAnalyzer();
  }
  return contextAnalyzer;
}

export type { SkillRecommendation, ContextAnalysis };
