/**
 * Exemplo de uso do Sistema de Habilidades do Moltbook
 *
 * Este exemplo mostra como analisar o contexto e buscar habilidades
 */

import { MoltbookSkillsAgent, analyzeContext, getSkillsForMessage } from './moltbookAgent';
import { MoltbookSkill } from './moltbookSkills';

// Exemplos de mensagens do usuário sobre o bot
const exemploMensagens = [
  // Exemplo 1: Adicionar nova funcionalidade
  "gostaria de adicionar integração com pix para pagamentos",
  // Exemplo 2: Corrigir problema
  "o bot está dando erro ao confirmar agendamento",
  // Exemplo 3: Deploy em produção
  "quero colocar o bot em produção, como fazer deploy",
  // Exemplo 4: Melhorar performance
  "o bot está lento, como posso melhorar a performance",
  // Exemplo 5: Pergunta geral
  "como funciona o sistema de agendamento"
];

// Demonstrar análise de contexto
console.log("=== DEMONSTRAÇÃO DO MOLTBOOK SKILLS AGENT ===\n");

for (const mensagem of exemploMensagens) {
  console.log(`\n📝 Mensagem: "${mensagem}"`);
  console.log("-".repeat(50));

  const resultado = analyzeContext(mensagem);

  console.log(`🎯 Intenções detectadas: ${resultado.intents.join(', ')}`);
  console.log(`🏷️ Palavras-chave: ${resultado.keywords.join(', ') || 'nenhuma'}`);
  console.log(`📊 Sentimento: ${resultado.sentiment}`);
  console.log(`📁 Tópico: ${resultado.topic}`);

  console.log(`\n🛠️ Habilidades do Moltbook recomendadas:`);
  if (resultado.relevantSkills.length === 0) {
    console.log("   Nenhuma habilidade específica encontrada");
  } else {
    for (const skill of resultado.relevantSkills.slice(0, 3)) {
      console.log(`   • [${skill.category}] ${skill.name}`);
      console.log(`     ${skill.description}`);
    }
  }

  if (resultado.suggestions.length > 0) {
    console.log(`\n💡 Sugestões:`);
    for (const suggestion of resultado.suggestions) {
      console.log(`   • ${suggestion}`);
    }
  }
}

// Função para usar no seu código
export function analisarMensagemDoUsuario(mensagem: string): {
  habilidades: MoltbookSkill[];
  sugestoes: string;
} {
  const resultado = analyzeContext(mensagem);
  const agent = new MoltbookSkillsAgent();

  return {
    habilidades: resultado.relevantSkills,
    sugestoes: agent.formatResult(resultado)
  };
}

console.log("\n=== FIM DA DEMONSTRAÇÃO ===");
