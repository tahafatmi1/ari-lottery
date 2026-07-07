import PublicHeader from './PublicHeader.jsx';

export default function PublicLayout({ children }) {
  return (
    <main className="min-h-screen bg-ink text-white">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.14),transparent_30%)]">
        <PublicHeader />
        {children}
      </div>
    </main>
  );
}
