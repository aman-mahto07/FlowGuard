import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowGuard — Release Intelligence",
  description: "AI-powered release risk analysis for product teams.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: "#0D1117", color: "#CDD9E5", minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}