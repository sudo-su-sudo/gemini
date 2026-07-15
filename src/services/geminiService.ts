
export async function generateContent(model: string, prompt: string, config: any = {}) {
  const response = await fetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, config })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Gemini API Error');
  }
  return response.json();
}

export async function chatWithGemini(model: string, messages: any[], systemInstruction?: string, tools?: any[]) {
  const response = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, systemInstruction, tools })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Gemini Chat Error');
  }
  return response.json();
}

export async function runKernelCommand(messages: any[]) {
  const response = await fetch('/api/kernel/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Kernel Command Error');
  }
  return response.json();
}
