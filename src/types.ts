export type CapabilityId = 'text' | 'vision' | 'audio' | 'video' | 'grounding' | 'function-calling' | 'live' | 'kernel';

export interface Capability {
  id: CapabilityId;
  title: string;
  description: string;
  icon: string;
  model: string;
  codeSnippet: string;
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  parts?: any[];
  groundingMetadata?: any;
}
