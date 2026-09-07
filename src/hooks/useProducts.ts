import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type Categoria = "Acessórios" | "Camisas" | "Calças" | "Mochilas";

export const CATEGORIAS: Categoria[] = ["Acessórios", "Camisas", "Calças", "Mochilas"];

export interface Product {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price: number;
  image_url: string | null;
  shopee_affiliate_link: string | null;
  created_at: string;
}

export interface Look {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  shopee_affiliate_link: string | null;
  created_at: string;
  products: Product[];
}

export function formatarPreco(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const productsQueryOptions = (categoria?: string) =>
  queryOptions({
    queryKey: ["products", categoria ?? "Todas"],
    queryFn: async (): Promise<Product[]> => {
      let query = supabase.from("products").select("*").order("created_at", { ascending: true });
      if (categoria && categoria !== "Todas") query = query.eq("category", categoria);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

export const looksQueryOptions = () =>
  queryOptions({
    queryKey: ["looks"],
    queryFn: async (): Promise<Look[]> => {
      const { data, error } = await supabase
        .from("looks")
        .select("*, look_products(position, products(*))")
        .order("created_at", { ascending: true });
      if (error) throw error;

      type Row = Omit<Look, "products"> & {
        look_products: { position: number; products: Product | null }[] | null;
      };

      return ((data ?? []) as Row[]).map((look) => ({
        ...look,
        products: (look.look_products ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((item) => item.products)
          .filter((p): p is Product => Boolean(p)),
      }));
    },
  });

export function useProducts(categoria?: string) {
  return useSuspenseQuery(productsQueryOptions(categoria));
}

export function useLooks() {
  return useSuspenseQuery(looksQueryOptions());
}
