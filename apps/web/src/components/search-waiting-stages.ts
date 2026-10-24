export type SearchWaitingStep = 'understand' | 'sources' | 'filter' | 'dedupe' | 'deep';
export type SearchWaitingStepState = 'completed' | 'current' | 'pending';

export interface SearchWaitingPhase {
  elapsedMs: number;
  message: string;
  step: SearchWaitingStep;
}

export const SEARCH_WAITING_PHASES: readonly SearchWaitingPhase[] = [
  { elapsedMs: 0, message: '正在理解关键词...', step: 'understand' },
  { elapsedMs: 1000, message: '正在检索多个网盘来源...', step: 'sources' },
  { elapsedMs: 2000, message: '正在筛选可用链接...', step: 'filter' },
  { elapsedMs: 3000, message: '正在去除重复资源...', step: 'dedupe' },
  {
    elapsedMs: 5000,
    message: '正在深度检索中，冷门关键词可能需要多等几秒...',
    step: 'deep',
  },
  {
    elapsedMs: 7000,
    message: '还在努力查找资源，请不要关闭页面。',
    step: 'deep',
  },
];

export const SEARCH_WAITING_STEPS: readonly {
  label: string;
  step: Exclude<SearchWaitingStep, 'deep'>;
}[] = [
  { label: '理解关键词', step: 'understand' },
  { label: '多网盘检索', step: 'sources' },
  { label: '筛选有效资源', step: 'filter' },
  { label: '整理搜索结果', step: 'dedupe' },
];

export const SEARCH_WAITING_EXPECTATION = '热门资源命中缓存会更快，冷门关键词首次搜索会稍慢。';
export const SEARCH_WAITING_FREE_HINT = '社区版搜索无需账号。';

export function getSearchWaitingPhase(elapsedMs: number): SearchWaitingPhase {
  const safeElapsedMs = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  let phase = SEARCH_WAITING_PHASES[0];

  for (const candidate of SEARCH_WAITING_PHASES) {
    if (candidate.elapsedMs > safeElapsedMs) {
      break;
    }
    phase = candidate;
  }

  return phase;
}

export function getSearchWaitingStepState(
  step: Exclude<SearchWaitingStep, 'deep'>,
  activeStep: SearchWaitingStep,
): SearchWaitingStepState {
  if (activeStep === 'deep') {
    return 'completed';
  }

  const stepIndex = SEARCH_WAITING_STEPS.findIndex((item) => item.step === step);
  const activeIndex = SEARCH_WAITING_STEPS.findIndex((item) => item.step === activeStep);

  if (stepIndex < activeIndex) {
    return 'completed';
  }

  return stepIndex === activeIndex ? 'current' : 'pending';
}
