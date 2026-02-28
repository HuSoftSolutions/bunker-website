import localFont from "next/font/local";
import "./globals.css";
import "react-toastify/dist/ReactToastify.css";
import type { Metadata } from "next";
import { FirebaseProvider } from "@/providers/FirebaseProvider";
import { SignTvFirebaseProvider } from "@/providers/SignTvFirebaseProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { ToastContainer } from "react-toastify";

const aller = localFont({
  src: [
    { path: "../public/assets/fonts/Aller_Rg.ttf", weight: "400", style: "normal" },
    { path: "../public/assets/fonts/Aller_Bd.ttf", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-aller",
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
      <body className={`${aller.variable} antialiased`}>
        <FirebaseProvider>
          <SignTvFirebaseProvider>
            <AuthProvider>
              {children}
              <ToastContainer
                position="top-right"
                autoClose={3500}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="dark"
              />
            </AuthProvider>
          </SignTvFirebaseProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}
