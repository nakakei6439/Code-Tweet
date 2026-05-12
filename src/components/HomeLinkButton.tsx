import Link from "next/link";

type Props = {
  className?: string;
};

export default function HomeLinkButton({ className = "" }: Props) {
  return (
    <Link
      href="/"
      className={`inline-flex h-9 w-fit shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-cyan-800/70
        bg-cyan-950/50 px-3 text-sm font-semibold text-cyan-100
        transition-colors hover:border-cyan-500 hover:bg-cyan-900/70 hover:text-white ${className}`}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </svg>
      ホーム
    </Link>
  );
}
