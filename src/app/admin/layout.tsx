export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#EDE6D8]">
      <header className="flex items-center justify-between bg-[#5B1220] px-8 py-4 text-[#E9D6A8]">
        <h1 className="font-serif text-xl">Cultum</h1>
        <span className="text-xs opacity-80">Panel de gestión (uso interno)</span>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}
