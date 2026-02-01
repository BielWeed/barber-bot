import { v4 as uuidv4 } from 'uuid';
import { getConfig, setConfig } from './database';

const MOLTBOOK_API_URL = process.env.MOLTBOOK_API_URL || 'https://api.moltbook.com';
const AGENT_ID = process.env.MOLTBOOK_AGENT_ID || 'biscuits-happycapy';
const AGENT_SECRET = process.env.MOLTBOOK_AGENT_SECRET || '';

interface MoltbookSkill {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  url: string;
}

interface MoltbookPost {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  likes: number;
}

interface MoltbookSkillsResponse {
  skills?: MoltbookSkill[];
}

interface MoltbookPostsResponse {
  posts?: MoltbookPost[];
}

export class MoltbookService {
  private apiKey: string;
  private agentName: string;

  constructor(apiKey?: string, agentName?: string) {
    this.apiKey = apiKey || AGENT_SECRET;
    this.agentName = agentName || AGENT_ID;
  }

  /**
   * Search for skills on Moltbook based on query
   */
  async searchSkills(query: string): Promise<MoltbookSkill[]> {
    try {
      const response = await fetch(`${MOLTBOOK_API_URL}/skills/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          query,
          limit: 5
        })
      });

      if (!response.ok) {
        console.log('Moltbook API not available, skipping skill search');
        return [];
      }

      const data: MoltbookSkillsResponse = await response.json();
      return data.skills || [];
    } catch (error) {
      console.log('Moltbook skill search unavailable:', error);
      return [];
    }
  }

  /**
   * Get trending skills on Moltbook
   */
  async getTrendingSkills(): Promise<MoltbookSkill[]> {
    try {
      const response = await fetch(`${MOLTBOOK_API_URL}/skills/trending`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) return [];

      const data: MoltbookSkillsResponse = await response.json();
      return data.skills || [];
    } catch (error) {
      console.log('Moltbook trending skills unavailable');
      return [];
    }
  }

  /**
   * Post to Moltbook feed
   */
  async post(content: string): Promise<boolean> {
    try {
      const response = await fetch(`${MOLTBOOK_API_URL}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          author: this.agentName,
          content
        })
      });

      return response.ok;
    } catch (error) {
      console.log('Moltbook post failed:', error);
      return false;
    }
  }

  /**
   * Get recent posts from feed
   */
  async getFeed(limit: number = 10): Promise<MoltbookPost[]> {
    try {
      const response = await fetch(`${MOLTBOOK_API_URL}/feed?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) return [];

      const data: MoltbookPostsResponse = await response.json();
      return data.posts || [];
    } catch (error) {
      console.log('Moltbook feed unavailable');
      return [];
    }
  }

  /**
   * Analyze context and find relevant skills
   * Maps Portuguese context to Moltbook skill searches
   */
  async findRelevantSkillsForContext(context: string): Promise<{
    skills: MoltbookSkill[];
    keywords: string[];
  }> {
    const keywords = this.extractKeywords(context);
    const skills: MoltbookSkill[] = [];

    // Map Portuguese keywords to Moltbook search terms
    const searchTerms = this.mapToSearchTerms(keywords);

    for (const term of searchTerms) {
      const foundSkills = await this.searchSkills(term);
      skills.push(...foundSkills);
    }

    // Remove duplicates
    const uniqueSkills = skills.filter((skill, index, self) =>
      index === self.findIndex(s => s.id === skill.id)
    );

    return {
      skills: uniqueSkills.slice(0, 5),
      keywords
    };
  }

  /**
   * Extract keywords from Portuguese context
   */
  private extractKeywords(context: string): string[] {
    const normalized = context.toLowerCase();

    // Portuguese keywords related to barber bot
    const keywordMappings: { [key: string]: string[] } = {
      'agendamento': ['scheduling', 'appointment', 'booking'],
      'horario': ['scheduling', 'time', 'appointment'],
      'whatsapp': ['whatsapp', 'messaging', 'chat'],
      'bot': ['bot', 'automation', 'ai'],
      'barbearia': ['barber', 'salon', 'haircut'],
      'cliente': ['customer', 'client', 'user'],
      'financeiro': ['finance', 'payment', 'money'],
      'banco': ['database', 'storage'],
      'mensagem': ['messaging', 'chat', 'message'],
      'grupo': ['group', 'team'],
      'servico': ['service', 'business'],
      'erro': ['error', 'debug', 'fix'],
      'problema': ['problem', 'issue', 'bug'],
      'deploy': ['deploy', 'production', 'hosting'],
      'api': ['api', 'integration'],
      'qrcode': ['qr', 'authentication'],
      'conexao': ['connection', 'socket'],
      'lembrete': ['notification', 'reminder'],
      'relatorio': ['report', 'analytics'],
      'configuracao': ['config', 'settings']
    };

    const foundKeywords: string[] = [];

    for (const [ptTerm, enTerms] of Object.entries(keywordMappings)) {
      if (normalized.includes(ptTerm)) {
        foundKeywords.push(...enTerms);
      }
    }

    return [...new Set(foundKeywords)];
  }

  /**
   * Map extracted keywords to Moltbook search terms
   */
  private mapToSearchTerms(keywords: string[]): string[] {
    // Priority mappings for common barber bot contexts
    const priorityMappings: { [key: string]: string } = {
      'whatsapp': 'whatsapp bot',
      'scheduling': 'appointment scheduling',
      'appointment': 'appointment booking',
      'database': 'sqlite database',
      'messaging': 'whatsapp messaging',
      'bot': 'ai assistant',
      'finance': 'payment processing',
      'group': 'group management',
      'qr': 'qr authentication'
    };

    const searchTerms: string[] = [];

    for (const keyword of keywords) {
      if (priorityMappings[keyword]) {
        searchTerms.push(priorityMappings[keyword]);
      } else {
        searchTerms.push(keyword);
      }
    }

    return searchTerms;
  }

  /**
   * Get skill recommendations based on conversation context
   */
  async getSkillRecommendations(context: string): Promise<string[]> {
    const { skills } = await this.findRelevantSkillsForContext(context);

    return skills.map(skill => {
      return `[${skill.name}](${skill.url}): ${skill.description}`;
    });
  }
}

// Singleton instance
let moltbookService: MoltbookService | null = null;

export function getMoltbookService(): MoltbookService {
  if (!moltbookService) {
    moltbookService = new MoltbookService();
  }
  return moltbookService;
}

export { type MoltbookSkill, type MoltbookPost };
