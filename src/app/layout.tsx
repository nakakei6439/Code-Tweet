// Next.js はルート layout の存在を要求するが、<html> / <body> は
// src/app/[locale]/layout.tsx 側でロケールに応じて出す。ここは素通しに留める。
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
