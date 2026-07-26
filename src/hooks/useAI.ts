import { useMutation } from '@tanstack/react-query';
import { aiService } from '../services/aiService';
import { unwrap } from '../utils/apiResponse';
import type { AIInvokeOptions } from '../types/ai.types';

/** Invokes the AI Catalyst Function. Pass a type param to type the response once the function exists. */
export function useInvokeAI<TResponse = unknown>() {
  return useMutation({
    mutationFn: (options: AIInvokeOptions) => aiService.invoke<TResponse>(options).then(unwrap),
  });
}
