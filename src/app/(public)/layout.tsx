import { Footer, Header, WhatsAppSupportButton } from "@/components/site-shell";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
      <WhatsAppSupportButton />
    </>
  );
}
