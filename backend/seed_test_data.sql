-- seed_test_data.sql
-- RouteKids - Datos de prueba.
-- Ejecutar: PGPASSWORD=admin psql -h localhost -p 5433 -U postgres -d routekids -f backend/seed_test_data.sql
-- Idempotente: borra datos previos (excepto usuarios) y reinserta el dataset.
-- Funciona tanto en una BD vacía (inserta los usuarios de prueba) como en una
-- existente (los upserta). Los usuarios de prueba se crean/actualizan en el
-- paso 1b con las credenciales documentadas en credenciales_prueba.md.
-- Las contraseñas se precalculan con bcrypt (mismo esquema que el backend).

SET client_encoding = 'UTF8';

BEGIN;

-- 1) Limpieza (orden FK-seguro), preservando usuarios
DELETE FROM asistencias;
DELETE FROM ubicaciones_gps;
DELETE FROM pagos;
DELETE FROM sesiones_ruta;
DELETE FROM alumnos;
DELETE FROM paradas;
DELETE FROM rutas;
DELETE FROM recorridos;

-- 1b) Usuarios de prueba (upsert): crea los usuarios en una BD vacía e
--     reestablece las credenciales en una BD existente. Así los INSERTs
--     siguientes que referencian usuarios por email (dueño, padres, conductores)
--     resuelven correctamente aunque la BD esté vacía.
--     password_hash = bcrypt ($2b$, mismo esquema que app/core/security.py).
INSERT INTO usuarios (nombre, apellido, email, password_hash, rol) VALUES
  ('Administrador','Sistema',   'admin@routekids.com',              '$2b$12$oNcNrb5gdEzsFH/J9dLnI.cpEBVb9ucja8vKiu0z1VNZicUzvL5TO', 'admin'),
  ('Carlos',      'Mendoza',    'carlos.dueno@routekids.com',       '$2b$12$aFoqFtvKZeY8oKkBTJ4qPue1dhshEwOAXqOlypCKozSnjc8dGt1ay', 'dueno'),
  ('Luis',        'Alfredo',    'luis.conductor@routekids.com',     '$2b$12$TuRRYakH8E1H1JF0z/qJZuc/4ZRPyubBiG12Uhjf3MKOaYt1S7PZG', 'conductor'),
  ('Yuliana',     'Valencia',   'valenciayuliana123@gmail.com',     '$2b$12$7GpYdtsdv6nYFhMQ8SDMlOJDyGi59UHw3ET71MWt3s/0ARcOctd.y', 'padre'),
  ('Padre',       'Demo',       'test@routekids.com',               '$2b$12$LCMlJjb0JPAco8El/cc9q.FpNtTEsX815sY.wgBm5TygJ/8BBv88y', 'padre'),
  ('Usuario',     'Conductor',  'uc@test.com',                      '$2b$12$BCBw8/o1wDKrvC/z7Sq62url8ZXuXN59mJCd.8Ir6Xk9d32MxKQQi', 'conductor')
ON CONFLICT (email) DO UPDATE SET
  nombre        = EXCLUDED.nombre,
  apellido      = EXCLUDED.apellido,
  password_hash = EXCLUDED.password_hash,
  rol           = EXCLUDED.rol;

-- 2) Recorridos (dueño = Carlos Mendoza)
INSERT INTO recorridos (nombre, descripcion, dueno_id, activo) VALUES
  ('Recorrido Norte', 'Cobertura zona norte de Quito', (SELECT id FROM usuarios WHERE email='carlos.dueno@routekids.com'), true),
  ('Recorrido Sur',   'Cobertura zona sur de Quito',   (SELECT id FROM usuarios WHERE email='carlos.dueno@routekids.com'), true);

-- 3) Rutas
INSERT INTO rutas (recorrido_id, nombre, tipo) VALUES
  ((SELECT id FROM recorridos WHERE nombre='Recorrido Norte'), 'Ruta Norte - Ida',   'ida'),
  ((SELECT id FROM recorridos WHERE nombre='Recorrido Norte'), 'Ruta Norte - Vuelta','vuelta'),
  ((SELECT id FROM recorridos WHERE nombre='Recorrido Sur'),   'Ruta Sur - Ida',    'ida'),
  ((SELECT id FROM recorridos WHERE nombre='Recorrido Sur'),   'Ruta Sur - Vuelta', 'vuelta');

-- 4) Paradas (coordenadas de Quito)
INSERT INTO paradas (ruta_id, nombre, latitud, longitud, orden) VALUES
  ((SELECT id FROM rutas WHERE nombre='Ruta Norte - Ida'), 'Terminal Cumbayá',      -0.175900, -78.431600, 1),
  ((SELECT id FROM rutas WHERE nombre='Ruta Norte - Ida'), 'Parada UDLA',           -0.170000, -78.440000, 2),
  ((SELECT id FROM rutas WHERE nombre='Ruta Norte - Ida'), 'Parada El Condado',     -0.185000, -78.460000, 3),
  ((SELECT id FROM rutas WHERE nombre='Ruta Norte - Ida'), 'Parada La Carolina',    -0.190000, -78.480000, 4),
  ((SELECT id FROM rutas WHERE nombre='Ruta Norte - Ida'), 'Colegio San Patricio',  -0.210000, -78.490000, 5),
  ((SELECT id FROM rutas WHERE nombre='Ruta Norte - Ida'), 'Terminal Mariscal',     -0.220000, -78.500000, 6),

  ((SELECT id FROM rutas WHERE nombre='Ruta Norte - Vuelta'), 'Terminal Mariscal',     -0.220000, -78.500000, 1),
  ((SELECT id FROM rutas WHERE nombre='Ruta Norte - Vuelta'), 'Colegio San Patricio',  -0.210000, -78.490000, 2),
  ((SELECT id FROM rutas WHERE nombre='Ruta Norte - Vuelta'), 'Parada La Carolina',    -0.190000, -78.480000, 3),
  ((SELECT id FROM rutas WHERE nombre='Ruta Norte - Vuelta'), 'Parada El Condado',     -0.185000, -78.460000, 4),
  ((SELECT id FROM rutas WHERE nombre='Ruta Norte - Vuelta'), 'Parada UDLA',           -0.170000, -78.440000, 5),
  ((SELECT id FROM rutas WHERE nombre='Ruta Norte - Vuelta'), 'Terminal Cumbayá',      -0.175900, -78.431600, 6),

  ((SELECT id FROM rutas WHERE nombre='Ruta Sur - Ida'), 'Terminal Quitumbe',   -0.280000, -78.540000, 1),
  ((SELECT id FROM rutas WHERE nombre='Ruta Sur - Ida'), 'Parada Chillogallo',  -0.270000, -78.520000, 2),
  ((SELECT id FROM rutas WHERE nombre='Ruta Sur - Ida'), 'Parada La Magdalena', -0.260000, -78.500000, 3),
  ((SELECT id FROM rutas WHERE nombre='Ruta Sur - Ida'), 'Parada Solanda',      -0.250000, -78.490000, 4),
  ((SELECT id FROM rutas WHERE nombre='Ruta Sur - Ida'), 'Colegio Sur',         -0.240000, -78.480000, 5),

  ((SELECT id FROM rutas WHERE nombre='Ruta Sur - Vuelta'), 'Colegio Sur',         -0.240000, -78.480000, 1),
  ((SELECT id FROM rutas WHERE nombre='Ruta Sur - Vuelta'), 'Parada Solanda',      -0.250000, -78.490000, 2),
  ((SELECT id FROM rutas WHERE nombre='Ruta Sur - Vuelta'), 'Parada La Magdalena', -0.260000, -78.500000, 3),
  ((SELECT id FROM rutas WHERE nombre='Ruta Sur - Vuelta'), 'Parada Chillogallo',  -0.270000, -78.520000, 4),
  ((SELECT id FROM rutas WHERE nombre='Ruta Sur - Vuelta'), 'Terminal Quitumbe',   -0.280000, -78.540000, 5);

-- 5) Alumnos (padres existentes: test@routekids.com, valenciayuliana123@gmail.com)
INSERT INTO alumnos (nombre, apellido, padre_id, recorrido_id, parada_id, fecha_nacimiento) VALUES
  ('Mateo',     'García',   (SELECT id FROM usuarios WHERE email='test@routekids.com'),                (SELECT id FROM recorridos WHERE nombre='Recorrido Norte'), (SELECT id FROM paradas WHERE nombre='Colegio San Patricio' AND ruta_id=(SELECT id FROM rutas WHERE nombre='Ruta Norte - Ida')), '2015-05-10'),
  ('Sofía',     'García',   (SELECT id FROM usuarios WHERE email='test@routekids.com'),                (SELECT id FROM recorridos WHERE nombre='Recorrido Norte'), (SELECT id FROM paradas WHERE nombre='Parada La Carolina'  AND ruta_id=(SELECT id FROM rutas WHERE nombre='Ruta Norte - Ida')), '2017-03-22'),
  ('Diego',     'García',   (SELECT id FROM usuarios WHERE email='test@routekids.com'),                (SELECT id FROM recorridos WHERE nombre='Recorrido Sur'),   (SELECT id FROM paradas WHERE nombre='Colegio Sur'         AND ruta_id=(SELECT id FROM rutas WHERE nombre='Ruta Sur - Ida')),   '2014-11-02'),
  ('Valentina', 'García',   (SELECT id FROM usuarios WHERE email='test@routekids.com'),                (SELECT id FROM recorridos WHERE nombre='Recorrido Sur'),   (SELECT id FROM paradas WHERE nombre='Parada Solanda'      AND ruta_id=(SELECT id FROM rutas WHERE nombre='Ruta Sur - Ida')),   '2018-07-15'),
  ('Lucas',     'Valencia', (SELECT id FROM usuarios WHERE email='valenciayuliana123@gmail.com'),       (SELECT id FROM recorridos WHERE nombre='Recorrido Norte'), (SELECT id FROM paradas WHERE nombre='Terminal Mariscal'    AND ruta_id=(SELECT id FROM rutas WHERE nombre='Ruta Norte - Ida')), '2016-09-30'),
  ('Camila',    'Valencia', (SELECT id FROM usuarios WHERE email='valenciayuliana123@gmail.com'),       (SELECT id FROM recorridos WHERE nombre='Recorrido Norte'), (SELECT id FROM paradas WHERE nombre='Parada El Condado'   AND ruta_id=(SELECT id FROM rutas WHERE nombre='Ruta Norte - Ida')), '2019-01-12'),
  ('Benjamín',  'Valencia', (SELECT id FROM usuarios WHERE email='valenciayuliana123@gmail.com'),       (SELECT id FROM recorridos WHERE nombre='Recorrido Sur'),   (SELECT id FROM paradas WHERE nombre='Terminal Quitumbe'   AND ruta_id=(SELECT id FROM rutas WHERE nombre='Ruta Sur - Ida')),   '2013-12-05'),
  ('Isabella',  'Valencia', (SELECT id FROM usuarios WHERE email='valenciayuliana123@gmail.com'),       (SELECT id FROM recorridos WHERE nombre='Recorrido Sur'),   (SELECT id FROM paradas WHERE nombre='Parada Chillogallo'  AND ruta_id=(SELECT id FROM rutas WHERE nombre='Ruta Sur - Ida')),   '2020-04-18');

-- 6) Sesiones en curso (una por recorrido, conductores distintos => cumple la
--    restricción uq_sesiones_ruta_conductor_en_curso). Así el dueño ve un bus vivo
--    en cada recorrido al cambiar el selector del mapa.
INSERT INTO sesiones_ruta (ruta_id, conductor_id, estado, inicio) VALUES
  ((SELECT id FROM rutas WHERE nombre='Ruta Norte - Ida'), (SELECT id FROM usuarios WHERE email='luis.conductor@routekids.com'), 'en_curso', now()),
  ((SELECT id FROM rutas WHERE nombre='Ruta Sur - Ida'),   (SELECT id FROM usuarios WHERE email='uc@test.com'),                 'en_curso', now());

-- 7) Resincronizar secuencias (evita colisión con futuros INSERTs por API)
SELECT setval('recorridos_id_seq',    (SELECT COALESCE(MAX(id),1) FROM recorridos));
SELECT setval('rutas_id_seq',         (SELECT COALESCE(MAX(id),1) FROM rutas));
SELECT setval('paradas_id_seq',       (SELECT COALESCE(MAX(id),1) FROM paradas));
SELECT setval('alumnos_id_seq',       (SELECT COALESCE(MAX(id),1) FROM alumnos));
SELECT setval('sesiones_ruta_id_seq', (SELECT COALESCE(MAX(id),1) FROM sesiones_ruta));

COMMIT;
