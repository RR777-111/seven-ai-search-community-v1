interface HomeHeroProps { compact?: boolean }
export function HomeHero({ compact = false }: HomeHeroProps) {
  return <section className={compact ? 'seven-font-body flex w-full min-w-0 flex-col gap-2 text-left' : 'seven-font-body flex w-full min-w-0 flex-col items-center gap-2 text-center'} aria-label="Seven AI Search Community"><h1 className={compact ? 'text-3xl font-black tracking-tight sm:text-4xl' : 'text-4xl font-black tracking-tight sm:text-6xl'}>Seven AI Search</h1><p className="text-sm font-semibold text-[#4b4b4b]">Community · 开放搜索</p></section>;
}
