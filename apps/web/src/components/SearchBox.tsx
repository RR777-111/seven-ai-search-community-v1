import type { FormEvent } from 'react';
import { NeoInput, NeoSearchButton } from '@/components/neo/neo-ui';

interface SearchBoxProps {
  isDisabled?: boolean;
  isLoading: boolean;
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  onSubmit: () => void;
}

export function SearchBox({
  isDisabled,
  isLoading,
  keyword,
  onKeywordChange,
  onSubmit,
}: SearchBoxProps) {
  const disabled = isDisabled ?? isLoading;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form
      className="mx-auto w-full max-w-[calc(100vw-2rem)] min-w-0 text-left"
      onSubmit={handleSubmit}
    >
      <div className="neo-search-shell flex w-full min-w-0 items-center gap-2 p-2 sm:gap-2.5">
        <div className="min-w-0 flex-1 basis-0">
          <label className="sr-only" htmlFor="search-keyword">
            搜索资源
          </label>
          <NeoInput
            id="search-keyword"
            type="search"
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder="搜索电影、软件、课程或其他资源"
            className="neo-search-input h-11 min-w-0 text-base sm:h-12"
            disabled={disabled}
            maxLength={100}
            autoComplete="off"
          />
        </div>
        <NeoSearchButton disabled={disabled} loading={isLoading} type="submit">
          {isLoading ? <SearchLoadingIcon /> : <SearchIcon />}
        </NeoSearchButton>
      </div>
    </form>
  );
}

function SearchLoadingIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-30" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-100"
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
