export default function Footer() {
  return (
    <footer className="bg-gourmet-brown-dark text-gourmet-bg border-t-2 border-gourmet-gold mt-20 py-12">
      <div className="max-w-7xl mx-auto px-4 text-center md:text-left grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        <div>
          <h4 className="font-serif text-2xl font-bold text-gourmet-gold">Alhos Gourmet da May</h4>
          <p className="text-sm opacity-80 italic">“Tempero que abraça o sabor.”</p>
        </div>
        <div className="text-sm space-y-1">
          <p><b className="text-gourmet-gold">WhatsApp:</b> (21) 98883-2361</p>
          <p><b className="text-gourmet-gold">PIX:</b> emdsdc@gmail.com</p>
        </div>
        <div className="text-center md:text-right">
          <span className="inline-block px-4 py-2 rounded-full border border-gourmet-gold/40 text-gourmet-gold text-sm font-serif">
            Obrigada pela preferência.
          </span>
        </div>
      </div>
    </footer>
  );
}