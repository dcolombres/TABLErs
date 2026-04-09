import fs from 'fs';
import path from 'path';

const categories = ['Laptops', 'Smartphones', 'Audio', 'Gaming', 'Wearables'];
const regions = ['Norte', 'Sur', 'Este', 'Oeste', 'Centro'];
const productNames = {
  'Laptops': ['MacBook Pro', 'MacBook Air', 'Dell XPS', 'Lenovo ThinkPad', 'HP Spectre'],
  'Smartphones': ['iPhone 15', 'Samsung S24', 'Google Pixel 8', 'OnePlus 12', 'Xiaomi 14'],
  'Audio': ['AirPods Pro', 'Sony XM5', 'Bose QC45', 'Beats Studio', 'JBL Flip'],
  'Gaming': ['PS5', 'Xbox Series X', 'Nintendo Switch', 'RTX 4080', 'Razer Blade'],
  'Wearables': ['Apple Watch', 'Galaxy Watch', 'Pixel Watch', 'Fitbit Charge', 'Garmin Fenix']
};
const genders = ['M', 'F', 'NB'];

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const data = [];
const startDate = new Date('2023-01-01');

for (let i = 1; i <= 200; i++) {
  const category = getRandom(categories);
  const productName = getRandom(productNames[category]);
  const region = getRandom(regions);
  const gender = getRandom(genders);
  const age = getRandomInt(18, 65);
  const quantity = getRandomInt(1, 5);
  const price = category === 'Laptops' ? getRandomInt(1000, 2500) : 
                category === 'Smartphones' ? getRandomInt(600, 1200) :
                category === 'Audio' ? getRandomInt(100, 400) :
                category === 'Gaming' ? getRandomInt(400, 800) : getRandomInt(150, 500);
  
  const amount = price * quantity;
  const date = new Date(startDate.getTime() + Math.random() * (new Date().getTime() - startDate.getTime()));
  const formattedDate = date.toISOString().split('T')[0];
  const satisfaction = getRandomInt(6, 10);

  data.push({
    id: i,
    fecha: formattedDate,
    producto: productName,
    categoria: category,
    monto: amount,
    cantidad: quantity,
    region: region,
    genero_cliente: gender,
    edad_cliente: age,
    satisfaccion: satisfaction
  });
}

// Generate CSV
const csvHeaders = Object.keys(data[0]).join(',');
const csvRows = data.map(row => Object.values(row).join(',')).join('\n');
const csvContent = `${csvHeaders}\n${csvRows}`;
fs.writeFileSync('examples/tech_store_sales.csv', csvContent);

// Generate SQL (MySQL compatible)
let sqlContent = "CREATE TABLE IF NOT EXISTS tech_store_sales (\n" +
  "  id INT NOT NULL AUTO_INCREMENT,\n" +
  "  fecha DATE NOT NULL,\n" +
  "  producto VARCHAR(255) NOT NULL,\n" +
  "  categoria VARCHAR(100) NOT NULL,\n" +
  "  monto DECIMAL(10,2) NOT NULL,\n" +
  "  cantidad INT NOT NULL,\n" +
  "  region VARCHAR(50) NOT NULL,\n" +
  "  genero_cliente VARCHAR(10) NOT NULL,\n" +
  "  edad_cliente INT NOT NULL,\n" +
  "  satisfaccion INT NOT NULL,\n" +
  "  PRIMARY KEY (id)\n" +
  ") ENGINE=InnoDB DEFAULT CHARSET=utf8;\n\n" +
  "INSERT INTO tech_store_sales (fecha, producto, categoria, monto, cantidad, region, genero_cliente, edad_cliente, satisfaccion) VALUES\n";

const sqlRows = data.map(row => {
  return `('${row.fecha}', '${row.producto.replace(/'/g, "''")}', '${row.categoria}', ${row.monto}, ${row.cantidad}, '${row.region}', '${row.genero_cliente}', ${row.edad_cliente}, ${row.satisfaccion})`;
}).join(',\n') + ';';

fs.writeFileSync('examples/tech_store_sales.sql', sqlContent + sqlRows);

console.log('Examples generated successfully in server/examples/');
