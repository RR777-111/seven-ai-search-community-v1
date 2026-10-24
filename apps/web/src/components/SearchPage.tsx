'use client';
import { useState } from 'react';
import { CategoryGrid } from '@/components/CategoryGrid';
import { Footer } from '@/components/Footer';
import { HomeHero } from '@/components/HomeHero';
import { SearchBox } from '@/components/SearchBox';
import { SearchDeepSearchStatus } from '@/components/SearchDeepSearchStatus';
import { SearchResults } from '@/components/SearchResults';
import { NeoBrand, NeoButton } from '@/components/neo/neo-ui';
import { useSearch } from '@/hooks/useSearch';
import { useSearchWaitingVisibility } from '@/hooks/search-waiting-visibility';

export function SearchPage() {
  const [keyword, setKeyword] = useState('');
  const { errorMessage, isSubmitDisabled, results, retryAfterSeconds, status, submitSearch, searchNotice, loadingStartedAt } = useSearch();
  const showSearchWaiting = useSearchWaitingVisibility(status, loadingStartedAt);
  const hasSearched = status !== 'idle' && status !== 'loading';
  const isResultView = status !== 'idle';
  function handleSearch(searchKeyword = keyword) { void submitSearch(searchKeyword); }
  function handleCategorySelect(categoryKeyword: string) { setKeyword(categoryKeyword); handleSearch(categoryKeyword); }
  return <main className="seven-font-body neo-page-shell">
    <header className="neo-home-header"><NeoBrand /></header>
    <div className="mx-auto flex w-full max-w-[960px] min-w-0 flex-1 flex-col px-4 sm:px-6 lg:px-8">
      <div className={isResultView ? 'flex w-full flex-col gap-6 pb-12 pt-6 sm:pt-8' : 'flex w-full flex-1 flex-col items-center justify-center gap-4 pb-6 pt-2 text-center sm:gap-5 sm:pb-10 sm:pt-4'}>
        <section className={isResultView ? 'flex w-full flex-col gap-6' : 'flex w-full min-w-0 max-w-[calc(100vw-2rem)] flex-col items-center gap-3 sm:max-w-[780px] sm:gap-4'}>
          <HomeHero compact={isResultView} />
          <div className="w-full"><SearchBox isDisabled={isSubmitDisabled || showSearchWaiting} isLoading={showSearchWaiting} keyword={keyword} onKeywordChange={setKeyword} onSubmit={handleSearch} /></div>
          {!isResultView ? <CategoryGrid onSelect={handleCategorySelect} /> : null}
        </section>
        <section className="w-full" aria-live="polite">
          {showSearchWaiting ? <SearchDeepSearchStatus /> : null}
          {status === 'error' ? <SearchErrorState disabled={isSubmitDisabled} message={errorMessage} onRetry={() => void submitSearch(keyword)} retryLabel={retryAfterSeconds > 0 ? `${retryAfterSeconds} 秒后重试` : '重新搜索'} /> : null}
          {hasSearched && status === 'success' && !showSearchWaiting && searchNotice ? <p role="status" className="neo-result-state neo-result-state-empty mb-4 px-4 py-3">{searchNotice}</p> : null}
          {hasSearched && status === 'success' && !showSearchWaiting ? <SearchResults results={results} /> : null}
        </section>
      </div>
    </div>
    <Footer variant="neo" />
  </main>;
}

export function SearchErrorState({ disabled = false, message, onRetry, retryLabel = '重新搜索' }: { disabled?: boolean; message: string; onRetry: () => void; retryLabel?: string }) {
  return <div className="neo-result-state neo-result-state-error overflow-hidden px-4 py-4 sm:px-5 sm:py-5" role="alert"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="text-base font-extrabold text-[#1b1b1b]">搜索失败</p><p className="neo-result-card-meta mt-1 break-words text-[#1b1b1b]">{message}</p></div><div className="neo-result-state-actions"><NeoButton className="bg-[#1b1b1b] px-4 text-sm text-white" disabled={disabled} onClick={onRetry}>{retryLabel}</NeoButton></div></div></div>;
}
