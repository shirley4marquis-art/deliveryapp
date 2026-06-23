export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f3f7ff] px-5 py-12">
      {children}
    </div>
  );
}
