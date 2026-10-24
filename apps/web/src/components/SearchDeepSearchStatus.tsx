'use client';

import { useEffect, useState } from 'react';
import {
  getSearchWaitingPhase,
  getSearchWaitingStepState,
  SEARCH_WAITING_EXPECTATION,
  SEARCH_WAITING_FREE_HINT,
  SEARCH_WAITING_STEPS,
} from '@/components/search-waiting-stages';

const SEARCH_WAITING_TICK_MS = 250;

export function SearchDeepSearchStatus() {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, SEARCH_WAITING_TICK_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const phase = getSearchWaitingPhase(elapsedMs);

  return (
    <div
      aria-busy="true"
      className="neo-result-state neo-result-state-loading overflow-hidden px-4 py-4 sm:px-5 sm:py-5"
      role="status"
    >
      <div className="flex flex-col gap-4">
        <div className="neo-result-state-line">
          <span
            aria-hidden="true"
            className="relative flex h-8 w-8 flex-none items-center justify-center rounded-[4px] border-2 border-[#1b1b1b] bg-[#ffdb3b] shadow-[2px_2px_0_#1b1b1b]"
          >
            <span className="h-3 w-3 animate-ping rounded-full bg-[#1b1b1b] opacity-20" />
            <span className="absolute h-2.5 w-2.5 rounded-full bg-[#1b1b1b]" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-extrabold text-[#1b1b1b]">正在检索资源</p>
            <p className="neo-result-card-meta mt-1 break-words text-[#4b4b4b]">
              正在从百度、夸克、迅雷、阿里、UC 等网盘来源聚合搜索。
            </p>
          </div>
        </div>

        <p className="rounded-[4px] border-2 border-[#1b1b1b] bg-white px-3 py-2 text-sm font-extrabold leading-5 text-[#1b1b1b] shadow-[2px_2px_0_#1b1b1b]">
          {phase.message}
        </p>

        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-4" aria-label="搜索阶段">
          {SEARCH_WAITING_STEPS.map((item) => {
            const state = getSearchWaitingStepState(item.step, phase.step);
            const isCurrent = state === 'current';
            const isCompleted = state === 'completed';

            return (
              <li
                key={item.step}
                className={`flex min-h-10 items-center gap-2 rounded-[4px] border-2 px-2.5 py-2 text-xs font-extrabold leading-4 shadow-[2px_2px_0_#1b1b1b] ${
                  isCurrent
                    ? 'border-[#1b1b1b] bg-[#ffdb3b] text-[#1b1b1b]'
                    : isCompleted
                      ? 'border-[#1b1b1b] bg-white text-[#1b1b1b]'
                      : 'border-[#b7b7b7] bg-[#f6f6f6] text-[#666666] shadow-none'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 text-[10px] leading-none ${
                    isCompleted
                      ? 'border-[#1b1b1b] bg-[#1b1b1b] text-white'
                      : 'border-current bg-white text-current'
                  }`}
                >
                  {isCompleted ? '✓' : isCurrent ? '·' : ''}
                </span>
                <span>{item.label}</span>
              </li>
            );
          })}
        </ol>

        <div className="grid gap-1.5 text-xs font-semibold leading-5 text-[#4b4b4b] sm:grid-cols-2">
          <p>{SEARCH_WAITING_EXPECTATION}</p>
          <p>{SEARCH_WAITING_FREE_HINT}</p>
        </div>
      </div>
    </div>
  );
}
