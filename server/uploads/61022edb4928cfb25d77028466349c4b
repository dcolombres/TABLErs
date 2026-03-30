-- Script de ejemplo para pruebas del MVP

CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL
);

INSERT INTO categorias (id, nombre) VALUES (1, 'Electrónica'), (2, 'Hogar'), (3, 'Ropa');

CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    categoria_id INTEGER,
    precio REAL,
    FOREIGN KEY(categoria_id) REFERENCES categorias(id)
);

INSERT INTO productos (id, nombre, categoria_id, precio) VALUES 
(1, 'Laptop UX', 1, 1500.00),
(2, 'Smartphone Pro', 1, 900.00),
(3, 'Cafetera Expresa', 2, 250.00),
(4, 'Sofá Confort', 2, 1200.00),
(5, 'Camisa de Verano', 3, 45.00),
(6, 'Zapatos de Cuero', 3, 85.00);

CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY,
    producto_id INTEGER,
    cantidad INTEGER,
    monto REAL,
    fecha DATE,
    FOREIGN KEY(producto_id) REFERENCES productos(id)
);

INSERT INTO ventas (producto_id, cantidad, monto, fecha) VALUES 
(1, 2, 3000.00, '2024-01-10'),
(2, 5, 4500.00, '2024-01-12'),
(1, 1, 1500.00, '2024-02-05'),
(3, 10, 2500.00, '2024-02-14'),
(4, 1, 1200.00, '2024-03-01'),
(5, 20, 900.00, '2024-03-15'),
(6, 4, 340.00, '2024-03-20'),
(2, 3, 2700.00, '2024-03-22');
