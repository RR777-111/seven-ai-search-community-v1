import type { ReactNode } from 'react';

interface CategoryGridProps {
  onSelect: (keyword: string) => void;
}

const CATEGORIES = [
  { name: '影视', icon: FilmDoodleIcon, fill: '#fff1a8' },
  { name: '软件', icon: AppDoodleIcon, fill: '#cfe9ff' },
  { name: '学习', icon: BookDoodleIcon, fill: '#d6f5c9' },
  { name: '音乐', icon: MusicDoodleIcon, fill: '#ffd6e7' },
  { name: '游戏', icon: GameDoodleIcon, fill: '#e6d9ff' },
] as const;

export function CategoryGrid({ onSelect }: CategoryGridProps) {
  return (
    <nav aria-label="资源类型" className="mx-auto w-full max-w-[calc(100vw-2rem)] min-w-0">
      <ul className="mx-auto grid w-full max-w-[360px] grid-cols-[repeat(5,minmax(0,1fr))] items-start gap-x-0 sm:max-w-2xl sm:gap-x-3">
        {CATEGORIES.map((category) => (
          <li key={category.name}>
            <button
              type="button"
              className="group seven-font-body flex min-h-14 w-full flex-col items-center gap-1.5 rounded-[4px] px-1 py-1.5 text-xs font-extrabold text-[#444444] transition hover:text-[#1b1b1b] active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b1b1b] sm:gap-2 sm:text-[13px]"
              onClick={() => onSelect(category.name)}
            >
              <span
                className="neo-doodle-category flex h-10 w-10 items-center justify-center rounded-[18px_15px_17px_14px] border-2 border-[#1b1b1b] text-[#1b1b1b] shadow-[2px_2px_0_#1b1b1b] sm:h-12 sm:w-12 sm:shadow-[3px_3px_0_#1b1b1b]"
                style={{ backgroundColor: category.fill }}
                aria-hidden="true"
              >
                <category.icon />
              </span>
              <span className="whitespace-nowrap leading-4">{category.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function DoodleSvg({ children, viewBox = '0 0 48 48' }: { children: ReactNode; viewBox?: string }) {
  return (
    <svg
      aria-hidden="true"
      className="h-7 w-7"
      fill="none"
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

function FilmDoodleIcon() {
  return (
    <DoodleSvg>
      <path d="M9 18.5 39 15l1.5 22.5-28.5 2L9 18.5Z" stroke="currentColor" strokeWidth="3" />
      <path d="m13 18-2.5-6.5 27-3 3 6.5" stroke="currentColor" strokeWidth="3" />
      <path d="m18 11 4.5 5M28 10l4.5 5.5" stroke="currentColor" strokeWidth="3" />
      <path d="M15 25h18M16 31h12" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
    </DoodleSvg>
  );
}

function AppDoodleIcon() {
  return (
    <DoodleSvg>
      <path d="M10 13.5 36.5 12l2 22.5L12 37 10 13.5Z" stroke="currentColor" strokeWidth="3" />
      <path d="M13 20h24" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
      <path
        d="m20 26-4 3.5 4 3.5M29 26l4 3.5-4 3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </DoodleSvg>
  );
}

function BookDoodleIcon() {
  return (
    <DoodleSvg>
      <path
        d="M11 14c5-2 9-1 13 3 4-4 8-5 13-3v24c-5-2-9-1-13 3-4-4-8-5-13-3V14Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        d="M24 17v23M15 22h5M29 22h5M15 29h5M29 29h5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </DoodleSvg>
  );
}

function MusicDoodleIcon() {
  return (
    <DoodleSvg>
      <path d="M29 11.5v22" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
      <path
        d="m29 13 9-2v6l-9 2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        d="M20 35c0 3-3 5-6.5 5S8 38.5 8 36s2.8-4.5 6.5-4.5S20 32.5 20 35Z"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path d="M20 35V18" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
      <path d="m20 19 9-2" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
    </DoodleSvg>
  );
}

function GameDoodleIcon() {
  return (
    <DoodleSvg>
      <path
        d="M13 21c3-3 19-3.5 22 0 2 2.5 4.5 12 2 14-2 1.5-6-3-8-5H19c-2 2-6 6.5-8 5-2.5-2 0-11.5 2-14Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        d="M18 25v6M15 28h6M30 26h.1M34 30h.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3.5"
      />
    </DoodleSvg>
  );
}
