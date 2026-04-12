import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Car Import MVP",
  description: "Bidfax + Max Bid Advisor"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
