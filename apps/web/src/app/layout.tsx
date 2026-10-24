import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Seven AI Search Community', description: '免登录网盘资源搜索' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN" className="h-full antialiased"><body className="flex min-h-full flex-col">{children}</body></html>; }
