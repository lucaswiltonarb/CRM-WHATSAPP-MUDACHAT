/**
 * Avatares dos agentes de IA.
 * Imagens 1:1 com fundo transparente — todas renderizadas no mesmo tamanho pelo CSS.
 */
import agent1 from './agent1.png';
import agent2 from './agent2.png';
import agent3 from './agent3.png';
import agent4 from './agent4.png';

export interface AgentAvatar {
  id: string;
  label: string;
  src: string;
}

export const AGENT_AVATARS: AgentAvatar[] = [
  { id: 'ava-1', label: 'Bruno', src: agent1 },
  { id: 'ava-2', label: 'Diego', src: agent2 },
  { id: 'ava-3', label: 'Lucas', src: agent3 },
  { id: 'ava-4', label: 'Rafa', src: agent4 },
];

export const avatarSrc = (id?: string) =>
  AGENT_AVATARS.find((a) => a.id === id)?.src ?? AGENT_AVATARS[0].src;
