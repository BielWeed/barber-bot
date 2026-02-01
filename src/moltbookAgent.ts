/**
 * Context-Aware Moltbook Skills Agent
 * Este módulo analisa o contexto das mensagens e sugere habilidades do Moltbook
 */

import { MOLTBOOK_SKILLS, MoltbookSkill, KEYWORD_TO_SKILLS, formatSkillsForResponse } from './moltbookSkills';

// Padrões de intenção do usuário
const INTENT_PATTERNS = {
  add_feature: [
    /adicionar/i, /criar/i, /novo/i, /implementar/i, /incluir/i,
    /gostaria/i, /preciso/i, /quero/i, /seria bom/i
  ],
  fix_bug: [
    /erro/i, /problema/i, /bug/i, /não funciona/i, /falha/i,
    /corrigir/i, /ajustar/i, /quebrou/i, /parou/i
  ],
  improve: [
    /melhorar/i, /otimizar/i, /melhor/i, /upgrade/i, /refatorar/i,
    /eficiente/i, /rápido/i, /performance/i
  ],
  question: [
    /como/i, /o que/i, /qual/i, /porque/i, /por que/i, /posso/i,
    /existe/i, /há/i, /tem/i, /pode/i
  ],
  deploy: [
    /deploy/i, /produção/i, /server/i, /hospedar/i, /colocar no ar/i,
    /subir/i, /ambiente/i, /docker/i, /railway/i, /render/i
  ],
  integrate: [
    /integrar/i, /conectar/i, /api/i, /webhook/i, /vincular/i,
    /pix/i, /pagamento/i, /gateway/i
  ],
  configure: [
    /configurar/i, /definir/i, /alterar/i, /mudar/i, /ajustar/i,
    /ambiente/i, /variável/i, /env/i
  ],
  analyze: [
    /analisar/i, /verificar/i, /checar/i, /revisar/i, /auditar/i,
    /status/i, /como está/i
  ]
};

// Palavras-chave específicas por domínio
const DOMAIN_KEYWORDS = {
  'agendamento': ['appointment-system', 'recurring', 'reminders', 'ical-sync'],
  'horario': ['appointment-system', 'recurring', 'reminders'],
  'whatsapp': ['whatsapp-baileys', 'whatsapp-buttons', 'message-templates'],
  'mensagem': ['whatsapp-baileys', 'message-templates', 'whatsapp-buttons'],
  'financeiro': ['pix-payment', 'financial-reports', 'invoice-gen'],
  'pagamento': ['pix-payment', 'financial-reports'],
  'banco': ['sqljs', 'database-migration', 'caching'],
  'dados': ['sqljs', 'database-migration', 'caching'],
  'cliente': ['crm-basic', 'customer-analytics', 'loyalty-program'],
  'erro': ['error-monitoring', 'logging', 'input-validation'],
  'problema': ['error-monitoring', 'logging', 'input-validation'],
  'debug': ['error-monitoring', 'logging'],
  'deploy': ['docker', 'cicd', 'error-monitoring'],
  'seguranca': ['input-validation', 'session-auth'],
  'validacao': ['input-validation'],
  'lembrete': ['reminders', 'push-notifications'],
  'notificacao': ['reminders', 'push-notifications'],
  'relatorio': ['financial-reports', 'customer-analytics'],
  'cache': ['caching'],
  'performance': ['caching', 'sqljs']
};

export interface ContextResult {
  intents: string[];
  keywords: string[];
  topic: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  relevantSkills: MoltbookSkill[];
  suggestions: string[];
}

export class MoltbookSkillsAgent {
  /**
   * Analisa uma mensagem e retorna contexto + habilidades relevantes
   */
  analyze(message: string): ContextResult {
    const normalizedMessage = message.toLowerCase();

    // Detectar intenções
    const intents = this.detectIntents(normalizedMessage);

    // Extrair palavras-chave
    const keywords = this.extractKeywords(normalizedMessage);

    // Determinar sentimento
    const sentiment = this.analyzeSentiment(normalizedMessage);

    // Determinar tópico principal
    const topic = this.detectTopic(keywords, intents);

    // Buscar habilidades relevantes
    const relevantSkills = this.findRelevantSkills(keywords, intents, topic);

    // Gerar sugestões
    const suggestions = this.generateSuggestions(intents, topic, relevantSkills);

    return {
      intents,
      keywords,
      topic,
      sentiment,
      relevantSkills,
      suggestions
    };
  }

  /**
   * Detecta intenções do usuário
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

    return detectedIntents.length > 0 ? detectedIntents : ['question'];
  }

  /**
   * Extrai palavras-chave da mensagem
   */
  private extractKeywords(message: string): string[] {
    const foundKeywords: string[] = [];

    for (const [keyword] of Object.entries(DOMAIN_KEYWORDS)) {
      if (message.includes(keyword)) {
        foundKeywords.push(keyword);
      }
    }

    return [...new Set(foundKeywords)];
  }

  /**
   * Analisa o sentimento da mensagem
   */
  private analyzeSentiment(message: string): 'positive' | 'neutral' | 'negative' {
    const positivePatterns = [/bom/i, /bastante/i, /funcionando/i, /ótimo/i, /excelente/i, /amei/i, /perfeito/i];
    const negativePatterns = [/erro/i, /problema/i, /bug/i, /ruim/i, /falha/i, /não funciona/i, /parou/i, /quebrou/i];

    for (const pattern of negativePatterns) {
      if (pattern.test(message)) return 'negative';
    }

    for (const pattern of positivePatterns) {
      if (pattern.test(message)) return 'positive';
    }

    return 'neutral';
  }

  /**
   * Detecta o tópico principal
   */
  private detectTopic(keywords: string[], intents: string[]): string {
    if (intents.includes('fix_bug')) return 'bug_fix';
    if (intents.includes('deploy')) return 'deployment';
    if (intents.includes('add_feature')) return 'feature_request';
    if (intents.includes('improve')) return 'improvement';
    if (intents.includes('integrate')) return 'integration';

    if (keywords.length > 0) return keywords[0];
    return 'general';
  }

  /**
   * Encontra habilidades relevantes baseadas no contexto
   */
  private findRelevantSkills(
    keywords: string[],
    intents: string[],
    topic: string
  ): MoltbookSkill[] {
    const skillSet = new Set<MoltbookSkill>();
    const prioritySkillIds: string[] = [];

    // Priorizar habilidades baseadas em keywords
    for (const keyword of keywords) {
      const skillIds = DOMAIN_KEYWORDS[keyword] || [];
      prioritySkillIds.push(...skillIds);
    }

    // Adicionar habilidades baseadas em intents
    if (intents.includes('fix_bug')) {
      prioritySkillIds.push('error-monitoring', 'logging', 'input-validation');
    }
    if (intents.includes('deploy')) {
      prioritySkillIds.push('docker', 'cicd');
    }
    if (intents.includes('integrate')) {
      prioritySkillIds.push('pix-payment', 'api-integration');
    }

    // Buscar habilidades únicas
    for (const skillId of [...new Set(prioritySkillIds)]) {
      const skill = MOLTBOOK_SKILLS.find(s => s.id === skillId);
      if (skill) {
        skillSet.add(skill);
      }
    }

    return Array.from(skillSet).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Gera sugestões baseadas na análise
   */
  private generateSuggestions(
    intents: string[],
    topic: string,
    skills: MoltbookSkill[]
  ): string[] {
    const suggestions: string[] = [];

    // Sugestões baseadas em intenção
    if (intents.includes('fix_bug')) {
      suggestions.push('Considere implementar logging estruturado para facilitar debug');
      suggestions.push('Adicione monitoramento de erros em tempo real');
    }

    if (intents.includes('add_feature')) {
      suggestions.push('Verifique as dependências necessárias');
      suggestions.push('Implemente testes unitários para a nova funcionalidade');
    }

    if (intents.includes('deploy')) {
      suggestions.push('Considere usar Docker para ambiente consistente');
      suggestions.push('Configure CI/CD para automação do deploy');
    }

    if (intents.includes('integrate')) {
      suggestions.push('Valide os dados de entrada para segurança');
      suggestions.push('Implemente tratamento de erros adequado');
    }

    // Adicionar sugestões de habilidades
    if (skills.length > 0) {
      suggestions.push(`Habilidade recomendada: ${skills[0].name}`);
    }

    return suggestions;
  }

  /**
   * Formata o resultado para resposta
   */
  formatResult(result: ContextResult): string {
    let response = '';

    if (result.relevantSkills.length > 0) {
      response += formatSkillsForResponse(result.relevantSkills);
    }

    if (result.suggestions.length > 0) {
      response += '\n---\n';
      response += '💡 *Sugestões:*\n';
      result.suggestions.forEach(s => {
        response += `• ${s}\n`;
      });
    }

    return response;
  }
}

// Singleton instance
let agent: MoltbookSkillsAgent | null = null;

export function getMoltbookSkillsAgent(): MoltbookSkillsAgent {
  if (!agent) {
    agent = new MoltbookSkillsAgent();
  }
  return agent;
}

// Função utilitária para uso rápido
export function analyzeContext(message: string): ContextResult {
  const agent = getMoltbookSkillsAgent();
  return agent.analyze(message);
}

export function getSkillsForMessage(message: string): MoltbookSkill[] {
  const result = analyzeContext(message);
  return result.relevantSkills;
}
