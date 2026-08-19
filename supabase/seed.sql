-- Datos ficticios para desarrollo. Reemplazar con el catálogo real del cliente.

insert into eventos (id, slug, nombre, cliente, sede, fecha_inicio, fecha_fin, color_primario)
values ('11111111-1111-1111-1111-111111111111', 'feria-demo', 'Feria de Vinos Demo',
        'Cliente Demo', 'Centro de Convenciones', current_date, current_date + 3, '#B03A48');

insert into expositores (id, evento_id, nombre, pais) values
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Bodega Valle Norte', 'Chile'),
  ('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Viñedos del Sur', 'Argentina'),
  ('a3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Casa Ica', 'Perú');

insert into stands (id, evento_id, expositor_id, codigo, zona) values
  ('b1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'A-04', 'Chile'),
  ('b2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'B-11', 'Argentina'),
  ('b3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'a3333333-3333-3333-3333-333333333333', 'C-02', 'Perú');

insert into productos
  (evento_id, expositor_id, stand_id, nombre, tipo, varietal, pais, region, anada,
   grado_alcohol, precio, cuerpo, dulzor, acidez, taninos, notas, maridajes, descripcion)
values
  ('11111111-1111-1111-1111-111111111111','a1111111-1111-1111-1111-111111111111','b1111111-1111-1111-1111-111111111111',
   'Reserva Cabernet Sauvignon','tinto','Cabernet Sauvignon','Chile','Valle del Maipo',2021,
   14.0, 89.00, 4, 2, 3, 4, '{"cassis","pimiento","vainilla"}', '{"carnes rojas","quesos"}',
   'Tinto estructurado con paso por barrica y taninos firmes.'),

  ('11111111-1111-1111-1111-111111111111','a1111111-1111-1111-1111-111111111111','b1111111-1111-1111-1111-111111111111',
   'Sauvignon Blanc Costero','blanco','Sauvignon Blanc','Chile','Valle de Casablanca',2023,
   12.5, 52.00, 2, 2, 5, 1, '{"cítricos","hierba fresca"}', '{"pescados y mariscos","aves"}',
   'Blanco fresco y punzante, de acidez marcada.'),

  ('11111111-1111-1111-1111-111111111111','a2222222-2222-2222-2222-222222222222','b2222222-2222-2222-2222-222222222222',
   'Malbec de Altura','tinto','Malbec','Argentina','Valle de Uco',2022,
   14.5, 120.00, 4, 3, 3, 3, '{"ciruela","violeta","chocolate"}', '{"carnes rojas","pastas"}',
   'Malbec de viñedo alto, frutado y de taninos redondos.'),

  ('11111111-1111-1111-1111-111111111111','a2222222-2222-2222-2222-222222222222','b2222222-2222-2222-2222-222222222222',
   'Rosado de Malbec','rosado','Malbec','Argentina','Mendoza',2023,
   12.0, 45.00, 2, 3, 4, 1, '{"frutilla","pomelo"}', '{"aves","solo, para tomar"}',
   'Rosado ligero, para beber bien frío.'),

  ('11111111-1111-1111-1111-111111111111','a3333333-3333-3333-3333-333333333333','b3333333-3333-3333-3333-333333333333',
   'Espumante Brut Nature','espumante','Chardonnay','Perú','Ica',2022,
   11.5, 68.00, 2, 1, 5, 1, '{"manzana verde","pan tostado"}', '{"pescados y mariscos","quesos"}',
   'Espumante seco por método tradicional.'),

  ('11111111-1111-1111-1111-111111111111','a3333333-3333-3333-3333-333333333333','b3333333-3333-3333-3333-333333333333',
   'Vino de Cosecha Tardía','dulce','Moscatel','Perú','Ica',2022,
   10.5, 58.00, 3, 5, 3, 1, '{"miel","durazno","azahar"}', '{"postres","quesos"}',
   'Dulce natural de uva sobremadurada, para acompañar postres.');
