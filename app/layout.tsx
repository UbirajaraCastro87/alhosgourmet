import type { Metadata } from "next";
import "./globals.css";
import { ProductProvider } from "@/context/ProductContext";
import { CartProvider } from "@/context/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import CheckoutModal from "@/components/CheckoutModal";
import Toast from "@/components/Toast";

export const metadata: Metadata = {
  title: "Alhos Gourmet | Tempero que abraça o sabor",
  description: "Loja oficial de temperos de alhos artesanais gourmet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ProductProvider>
          <CartProvider>
            <Navbar />
            <main>{children}</main>
            <CartDrawer />
            <CheckoutModal />
            <Toast />
            <Footer />
          </CartProvider>
        </ProductProvider>
      </body>
    </html>
  );
}