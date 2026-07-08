import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "أثال — منصة الخبرة القضائية الذكية",
  description:
    "منصة الخبرة القضائية التي تحوّل الأدلة إلى تقارير يمكن الدفاع عنها. الذكاء يقترح، والخبير يعتمد.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
