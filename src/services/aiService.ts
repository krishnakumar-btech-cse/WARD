import { fail } from '../utils/apiResponse';
import { CatalystApiError } from '../utils/apiError';
import type { ApiResult } from '../utils/apiResponse';
import type { AIInvokeOptions } from '../types/ai.types';

/**
 * No AI function is deployed in this build — every AI-branded feature
 * (Case Summary, Investigation Suggestions, free-form questions) already
 * treats a failed invoke as "fall back to an honestly-labeled sample
 * response," so this fails fast rather than pretending to call something
 * that doesn't exist.
 */
class AIService {
  async invoke<TResponse = unknown>(_options: AIInvokeOptions = {}): Promise<ApiResult<TResponse>> {
    return fail(new CatalystApiError({ message: 'No AI function is connected in this build.', code: 'REQUEST_FAILED' }));
  }
}

export const aiService = new AIService();
