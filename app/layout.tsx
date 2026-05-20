import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IEEE UoP Hackathon Judging",
  description: "Hackathon judging platform for the IEEE UoP Student Branch.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
