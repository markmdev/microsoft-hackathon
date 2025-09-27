import type { Metadata } from "next";

import { Manrope } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { CopilotKit } from "@copilotkit/react-core";
import "./globals.css";
import "@copilotkit/react-ui/styles.css";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Ross AI - Legal Operations Platform",
  description: "AI-powered legal operations platform for case management and triage",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${GeistMono.variable}`}>
      <body className="subpixel-antialiased">
        <CopilotKit
          runtimeUrl="/api/copilotkit"
          agent="lawyer_copilot"
          publicApiKey={process.env.COPILOT_CLOUD_PUBLIC_API_KEY} // optional (for CopilotKit Cloud features)
        >
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}
