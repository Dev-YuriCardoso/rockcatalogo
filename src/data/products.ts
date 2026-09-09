import acessorios from "@/assets/acessorios.jpg";
import camisa from "@/assets/camisa.jpg";
import calca from "@/assets/calca.jpg";
import mochila from "@/assets/mochila.jpg";

export type Categoria = "Acessórios" | "Camisas" | "Calças" | "Mochilas";

export const CATEGORIAS: Categoria[] = ["Acessórios", "Camisas", "Calças", "Mochilas"];

export interface Produto {
  id: string;
  titulo: string;
  categoria: string;
  preco: string;
  imagem: string;
  link: string;
}

/** Imagem usada quando o produto cadastrado não tem foto própria. */
export const IMAGENS_PADRAO: Record<string, string> = {
  Acessórios: acessorios,
  Camisas: camisa,
  Calças: calca,
  Mochilas: mochila,
};

export function formatarPreco(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type ProdutoRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price: number;
  image_url: string | null;
  shopee_affiliate_link: string | null;
  created_at: string;
};

/** Converte uma linha do banco no formato usado pelos cards. */
export function toProduto(row: ProdutoRow): Produto {
  return {
    id: row.id,
    titulo: row.title,
    categoria: row.category,
    preco: formatarPreco(Number(row.price) || 0),
    imagem: row.image_url || IMAGENS_PADRAO[row.category] || camisa,
    link: row.shopee_affiliate_link || "https://shopee.com.br",
  };
}
