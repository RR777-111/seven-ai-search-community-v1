import { SearchApiError } from '../services/search.ts';

export function getSearchUiErrorMessage(error: unknown): string {
  if (!(error instanceof SearchApiError)) {
    return '网络异常，请稍后重试';
  }

  if (error.code === 'SEARCH_IN_PROGRESS') {
    return '正在搜索，请勿重复提交';
  }

  if (error.code === 'RATE_LIMITED' || error.status === 429) {
    return error.retryAfterSeconds
      ? `搜索过于频繁，请在 ${error.retryAfterSeconds} 秒后重试`
      : '搜索过于频繁，请稍后再试';
  }

  if (error.code === 'SEARCH_TIMEOUT') {
    return '本次搜索响应超时，请稍后重试。';
  }

  if (error.status === 0) {
    return '网络异常，请稍后重试';
  }

  if (error.status >= 500 || error.status === 404) {
    return '搜索服务暂时不可用，请稍后重试';
  }

  const message = sanitizeBusinessErrorMessage(error.message);
  return message || '搜索服务暂时不可用，请稍后重试';
}

function sanitizeBusinessErrorMessage(message: string): string {
  const normalizedMessage = message.trim();

  if (
    !normalizedMessage ||
    /\b(prisma|sql|stack|trace|exception|axios|fetch|unknown error)\b/i.test(normalizedMessage) ||
    normalizedMessage.includes('[object Object]')
  ) {
    return '';
  }

  return normalizedMessage;
}
