CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  image_url text,
  shopee_affiliate_link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update products" ON public.products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete products" ON public.products FOR DELETE TO authenticated USING (true);

CREATE TABLE public.looks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  image_url text,
  shopee_affiliate_link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.looks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.looks TO authenticated;
GRANT ALL ON public.looks TO service_role;
ALTER TABLE public.looks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Looks are viewable by everyone" ON public.looks FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert looks" ON public.looks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update looks" ON public.looks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete looks" ON public.looks FOR DELETE TO authenticated USING (true);

CREATE TABLE public.look_products (
  look_id uuid NOT NULL REFERENCES public.looks(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  PRIMARY KEY (look_id, product_id)
);

GRANT SELECT ON public.look_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.look_products TO authenticated;
GRANT ALL ON public.look_products TO service_role;
ALTER TABLE public.look_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Look items are viewable by everyone" ON public.look_products FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert look items" ON public.look_products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update look items" ON public.look_products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete look items" ON public.look_products FOR DELETE TO authenticated USING (true);

INSERT INTO public.products (title, description, category, price, image_url, shopee_affiliate_link) VALUES
('Camiseta Banda Doom — Estampa Caveira','Algodão pesado com estampa serigrafada de caveira.','Camisas',79.90,'/img/camisa.jpg','https://shopee.com.br'),
('Camiseta Preta Oversized Gothic Print','Modelagem ampla, toque macio, estampa gótica frontal.','Camisas',69.90,'/img/camisa.jpg','https://shopee.com.br'),
('Camiseta Thrash Metal Vintage Lavada','Efeito lavado vintage com estampa desgastada.','Camisas',89.90,'/img/camisa.jpg','https://shopee.com.br'),
('Pulseira de Couro com Espinhos','Couro legítimo com rebites e fecho ajustável.','Acessórios',34.90,'/img/acessorios.jpg','https://shopee.com.br'),
('Colar Corrente Prata Punk','Corrente grossa em aço com acabamento prata.','Acessórios',29.90,'/img/acessorios.jpg','https://shopee.com.br'),
('Kit Anéis Caveira Aço Inox','Conjunto de 4 anéis em aço inox antialérgico.','Acessórios',44.90,'/img/acessorios.jpg','https://shopee.com.br'),
('Calça Jeans Skinny Rasgada Preta','Jeans preto com destroyed nos joelhos.','Calças',119.90,'/img/calca.jpg','https://shopee.com.br'),
('Calça Cargo Preta com Correntes','Cargo com bolsos amplos e correntes removíveis.','Calças',139.90,'/img/calca.jpg','https://shopee.com.br'),
('Calça Bondage Straps Rock','Tiras laterais e caimento reto, estilo bondage.','Calças',149.90,'/img/calca.jpg','https://shopee.com.br'),
('Mochila Couro com Rebites Punk','Couro sintético com rebites e forro reforçado.','Mochilas',189.90,'/img/mochila.jpg','https://shopee.com.br'),
('Mochila Preta Tática Street Rock','Compartimento para notebook e alças acolchoadas.','Mochilas',159.90,'/img/mochila.jpg','https://shopee.com.br'),
('Mochila Mini Spikes Gothic','Modelo compacto com spikes metálicos.','Mochilas',129.90,'/img/mochila.jpg','https://shopee.com.br');

INSERT INTO public.looks (title, description, image_url, shopee_affiliate_link) VALUES
('Look Metal Clássico','Camiseta de banda, calça skinny rasgada e acessórios em couro.','/img/look.jpg','https://shopee.com.br'),
('Look Gothic Street','Oversized, cargo com correntes e mochila de rebites.','/img/look.jpg','https://shopee.com.br');

INSERT INTO public.look_products (look_id, product_id, position)
SELECT l.id, p.id, x.pos
FROM public.looks l
JOIN (VALUES
  ('Look Metal Clássico','Camiseta Banda Doom — Estampa Caveira',1),
  ('Look Metal Clássico','Calça Jeans Skinny Rasgada Preta',2),
  ('Look Metal Clássico','Pulseira de Couro com Espinhos',3),
  ('Look Gothic Street','Camiseta Preta Oversized Gothic Print',1),
  ('Look Gothic Street','Calça Cargo Preta com Correntes',2),
  ('Look Gothic Street','Colar Corrente Prata Punk',3),
  ('Look Gothic Street','Mochila Couro com Rebites Punk',4)
) AS x(look_title, product_title, pos) ON x.look_title = l.title
JOIN public.products p ON p.title = x.product_title;