import localFont from "next/font/local";
import "./globals.css";
import type { Metadata } from "next";
import { FirebaseProvider } from "@/providers/FirebaseProvider";
import { AuthProvider } from "@/providers/AuthProvider";

const aller = localFont({
  src: [
    { path: "../public/assets/fonts/Aller_Std_Lt.ttf", weight: "300", style: "normal" },
    { path: "../public/assets/fonts/Aller_Std_LtIt.ttf", weight: "300", style: "italic" },
    { path: "../public/assets/fonts/Aller_Std_Rg.ttf", weight: "400", style: "normal" },
    { path: "../public/assets/fonts/Aller_Std_It.ttf", weight: "400", style: "italic" },
    { path: "../public/assets/fonts/Aller_Std_Bd.ttf", weight: "700", style: "normal" },
    { path: "../public/assets/fonts/Aller_Std_BdIt.ttf", weight: "700", style: "italic" },
  ],
  display: "swap",
  variable: "--font-aller",
});

const allerDisplay = localFont({
  src: "../public/assets/fonts/AllerDisplay_Std_Rg.ttf",
  display: "swap",
  variable: "--font-aller-display",
});

export const metadata: Metadata = {
  title: "The Bunker",
  description: "Indoor golf, events, and lounge experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${aller.variable} ${allerDisplay.variable} antialiased`}
      >
        <FirebaseProvider>
          <AuthProvider>{children}</AuthProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}
