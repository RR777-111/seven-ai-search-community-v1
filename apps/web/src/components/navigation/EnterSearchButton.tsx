import Link from 'next/link';

export function EnterSearchButton({ className = '' }: { className?: string }) {
  return (
    <Link aria-label="进入搜索首页" className={`enter-search-button ${className}`.trim()} href="/">
      <svg aria-hidden="true" viewBox="0 0 62 46" role="img">
        <path d="M7 11 17 3h38l-9 8Z" fill="#f8e7ae" stroke="currentColor" strokeWidth="2" />
        <path d="m46 11 9-8v31l-9 8Z" fill="#cab66f" stroke="currentColor" strokeWidth="2" />
        <path d="M7 11h39v31H7Z" fill="#fff4c9" stroke="currentColor" strokeWidth="2" />
        <text x="26.5" y="31" textAnchor="middle">
          进入
        </text>
      </svg>
    </Link>
  );
}
