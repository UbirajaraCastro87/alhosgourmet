export interface Product { id: string; nome: string; descricao: string; preco: number; imagem: string; }
export interface CartItem { product: Product; quantity: number; }