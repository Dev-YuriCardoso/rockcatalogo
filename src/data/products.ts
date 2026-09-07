import acessorios from "@/assets/acessorios.jpg";
import camisa from "@/assets/camisa.jpg";
import calca from "@/assets/calca.jpg";
import mochila from "@/assets/mochila.jpg";

export type Categoria = "Acessórios" | "Camisas" | "Calças" | "Mochilas";

export const CATEGORIAS: Categoria[] = ["Acessórios", "Camisas", "Calças", "Mochilas"];

export interface Produto {
  id: string;
  titulo: string;
  categoria: Categoria;
  preco: string;
  imagem: string;
  link: string;
}

const SHOPEE = "https://shopee.com.br";

export const PRODUTOS: Produto[] = [
  { id: "c1", titulo: "Camiseta Banda Doom — Estampa Caveira", categoria: "Camisas", preco: "R$ 79,90", imagem: camisa, link: SHOPEE },
  { id: "c2", titulo: "Camiseta Preta Oversized Gothic Print", categoria: "Camisas", preco: "R$ 69,90", imagem: camisa, link: SHOPEE },
  { id: "c3", titulo: "Camiseta Thrash Metal Vintage Lavada", categoria: "Camisas", preco: "R$ 89,90", imagem: camisa, link: SHOPEE },
  { id: "a1", titulo: "Pulseira de Couro com Espinhos", categoria: "Acessórios", preco: "R$ 34,90", imagem: acessorios, link: SHOPEE },
  { id: "a2", titulo: "Colar Corrente Prata Punk", categoria: "Acessórios", preco: "R$ 29,90", imagem: acessorios, link: SHOPEE },
  { id: "a3", titulo: "Kit Anéis Caveira Aço Inox", categoria: "Acessórios", preco: "R$ 44,90", imagem: acessorios, link: SHOPEE },
  { id: "p1", titulo: "Calça Jeans Skinny Rasgada Preta", categoria: "Calças", preco: "R$ 119,90", imagem: calca, link: SHOPEE },
  { id: "p2", titulo: "Calça Cargo Preta com Correntes", categoria: "Calças", preco: "R$ 139,90", imagem: calca, link: SHOPEE },
  { id: "p3", titulo: "Calça Bondage Straps Rock", categoria: "Calças", preco: "R$ 149,90", imagem: calca, link: SHOPEE },
  { id: "m1", titulo: "Mochila Couro com Rebites Punk", categoria: "Mochilas", preco: "R$ 189,90", imagem: mochila, link: SHOPEE },
  { id: "m2", titulo: "Mochila Preta Tática Street Rock", categoria: "Mochilas", preco: "R$ 159,90", imagem: mochila, link: SHOPEE },
  { id: "m3", titulo: "Mochila Mini Spikes Gothic", categoria: "Mochilas", preco: "R$ 129,90", imagem: mochila, link: SHOPEE },
];
