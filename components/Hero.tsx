import Link from "next/link";
export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gourmet-brown text-gourmet-bg py-20 lg:py-28 border-b-4 border-gourmet-gold">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-gourmet-bg/10 border border-gourmet-gold text-gourmet-gold text-xs uppercase tracking-widest font-semibold">
            🌿 Feito com paixão culinária
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-gourmet-bg">
            ALHOS GOURMET
          </h1>
          <p className="font-serif text-2xl sm:text-3xl text-gourmet-gold italic font-light">
            “Tempero que abraça o sabor.”
          </p>
          <p className="text-gourmet-bg/80 text-base sm:text-lg max-w-xl mx-auto lg:mx-0">
            Nossos temperos artesanais combinam alhos nobres selecionados, azeites finos e ervas frescas.
          </p>
          <div>
            <Link href="#produtos" className="inline-block px-8 py-4 rounded-xl bg-gourmet-gold hover:bg-gourmet-gold-hover text-gourmet-bg font-semibold tracking-wide transition shadow-xl border border-amber-300/30">
              Ver Sabores
            </Link>
          </div>
        </div>
        <div className="lg:col-span-5 flex justify-center">
          <div className="rounded-2xl overflow-hidden border-2 border-gourmet-gold shadow-2xl w-72 h-80 sm:w-96 sm:h-[400px]">
            <img src="https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&q=80&w=900" alt="Alhos Gourmet" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
}