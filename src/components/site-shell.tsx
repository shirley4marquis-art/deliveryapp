import Link from "next/link";
import { MessageCircle, PackageCheck, PhoneCall } from "lucide-react";

const navItems = [
  ["Home", "/"],
  ["Track Parcel", "/track"],
  ["Services", "/services"],
  ["About Us", "/about"],
  ["FAQ", "/faq"],
  ["Contact", "/contact"],
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#b9d5ff] bg-[#e8f3ff] text-[#07152f] shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link className="flex items-center gap-3" href="/">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0047bb] text-white shadow-sm">
            <PackageCheck aria-hidden="true" size={24} />
          </span>
          <span>
            <span className="block text-xl font-black tracking-normal text-[#07152f]">
              TBC
            </span>
            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#0047bb]">
              Royal Mail branch delivery service
            </span>
          </span>
        </Link>
        <nav className="flex gap-2 overflow-x-auto pb-1 text-sm font-semibold text-[#10213f] lg:flex-wrap lg:pb-0">
          {navItems.map(([label, href]) => (
            <Link
              className="whitespace-nowrap rounded-lg px-3 py-2 hover:bg-white hover:text-[#0047bb]"
              href={href}
              key={href}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-[#c8d9f5] bg-[#f3f7ff] text-[#07152f]">
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-10 md:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0047bb]">
              <PackageCheck aria-hidden="true" size={22} />
            </span>
            <span className="text-lg font-black">TBC</span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-6 text-[#10213f]">
            Fast, secure and reliable UK parcel delivery for households,
            retailers, offices and growing businesses.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em]">
            Support
          </h2>
          <div className="mt-4 grid gap-2 text-sm font-semibold text-[#10213f]">
            <Link href="/track">Track a parcel</Link>
            <Link href="/contact">Contact support</Link>
            <Link href="/faq">Delivery FAQ</Link>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em]">
            Contact
          </h2>
          <p className="mt-4 flex items-center gap-2 text-sm text-[#10213f]">
            <PhoneCall aria-hidden="true" size={16} />
            07346 535643
          </p>
          <p className="mt-2 text-sm text-[#10213f]">
            contact@royalruns.co.uk
          </p>
        </div>
      </div>
    </footer>
  );
}

function TelegramIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height={26}
      viewBox="0 0 24 24"
      width={26}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

export function WhatsAppSupportButton() {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-center gap-3 md:bottom-6 md:right-6">
      {/* Telegram channel */}
      <a
        aria-label="Join TBC Telegram channel"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2aabee] text-white shadow-[0_14px_34px_rgba(7,21,47,0.28)] transition-transform hover:-translate-y-1 hover:bg-[#1a96d4] focus-visible:outline-[#07152f]"
        href="https://t.me/+VaaUt7AMvnk4M2Jl"
        rel="noopener noreferrer"
        target="_blank"
        title="Join our Telegram channel"
      >
        <TelegramIcon />
      </a>
      {/* Telegram admin / direct */}
      <a
        aria-label="Message TBC admin on Telegram"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1a6fa8] text-white shadow-[0_14px_34px_rgba(7,21,47,0.28)] transition-transform hover:-translate-y-1 hover:bg-[#155d8e] focus-visible:outline-[#07152f]"
        href="https://t.me/mrsully01"
        rel="noopener noreferrer"
        target="_blank"
        title="Message admin on Telegram"
      >
        <TelegramIcon />
      </a>
      {/* WhatsApp */}
      <a
        aria-label="Chat with TBC on WhatsApp"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_14px_34px_rgba(7,21,47,0.28)] transition-transform hover:-translate-y-1 hover:bg-[#1ebe5d] focus-visible:outline-[#07152f]"
        href="https://wa.me/447346535643?text=Hello%20Royal%20Runs%2C%20I%20need%20support%20with%20a%20delivery."
        rel="noopener noreferrer"
        target="_blank"
        title="WhatsApp support"
      >
        <MessageCircle aria-hidden="true" size={28} strokeWidth={2.5} />
      </a>
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-[#f3f7ff]">
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#ef3340]">
          {eyebrow}
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-normal text-[#07152f] md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[#10213f]">
          {children}
        </p>
      </div>
    </section>
  );
}
