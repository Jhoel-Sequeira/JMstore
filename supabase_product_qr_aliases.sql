CREATE TABLE IF NOT EXISTS public.producto_codigos_qr (
  codigo_qr varchar(255) PRIMARY KEY,
  producto_id integer NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_producto_codigos_qr_producto_id
  ON public.producto_codigos_qr (producto_id);

ALTER TABLE public.producto_codigos_qr ENABLE ROW LEVEL SECURITY;
