export default function PrintLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen bg-slate-200 pb-8 print:bg-white print:pb-0">{children}</div>;
}
