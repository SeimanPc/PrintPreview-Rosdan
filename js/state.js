// ==================== ESTADO Y CONFIGURACIÓN COMPARTIDA ====================

export const vistas = [
  { id: 'delante', nombre: 'Delante', archivo: 'images/delante.png' },
  { id: 'espalda', nombre: 'Espalda', archivo: 'images/espalda.png' },
  { id: 'derecho', nombre: 'Derecho', archivo: 'images/derecho.png' },
  { id: 'izquierdo', nombre: 'Izquierdo', archivo: 'images/izquierdo.png' }
];

export const coloresPaleta = [
  { nombre: 'Color 01', r: 255, g: 255, b: 255 },
  { nombre: 'Color 132', r: 239, g: 230, b: 229 },
  { nombre: 'Color 229', r: 217, g: 184, b: 167 },
  { nombre: 'Color 87', r: 104, g: 60, b: 46 },
  { nombre: 'Color 03', r: 255, g: 228, b: 0 },
  { nombre: 'Color 73', r: 239, g: 225, b: 167 },
  { nombre: 'Color 276', r: 197, g: 162, b: 81 },
  { nombre: 'Color 31', r: 240, g: 137, b: 39 },
  { nombre: 'Color 60', r: 220, g: 0, b: 46 },
  { nombre: 'Color 120', r: 255, g: 109, b: 106 },
  { nombre: 'Color 277', r: 175, g: 108, b: 103 },
  { nombre: 'Color 57', r: 140, g: 23, b: 19 },
  { nombre: 'Color 78', r: 220, g: 0, b: 107 },
  { nombre: 'Color 481', r: 233, g: 130, b: 160 },
  { nombre: 'Color 71', r: 117, g: 13, b: 104 },
  { nombre: 'Color 711', r: 90, g: 91, b: 159 },
  { nombre: 'Color 05', r: 0, g: 96, b: 169 },
  { nombre: 'Color 101', r: 181, g: 206, b: 223 },
  { nombre: 'Color 10', r: 196, g: 221, b: 241 },
  { nombre: 'Color 12', r: 0, g: 160, b: 209 },
  { nombre: 'Color 43', r: 0, g: 143, b: 193 },
  { nombre: 'Color 86', r: 76, g: 103, b: 129 },
  { nombre: 'Color 55', r: 0, g: 29, b: 67 },
  { nombre: 'Color 45', r: 15, g: 78, b: 103 },
  { nombre: 'Color 267', r: 101, g: 154, b: 158 },
  { nombre: 'Color 98', r: 159, g: 217, b: 215 },
  { nombre: 'Color 114', r: 193, g: 215, b: 132 },
  { nombre: 'Color 83', r: 81, g: 160, b: 37 },
  { nombre: 'Color 20', r: 0, g: 143, b: 79 },
  { nombre: 'Color 56', r: 0, g: 66, b: 55 },
  { nombre: 'Color 152', r: 83, g: 95, b: 73 }
];

export const blendModes = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten'];

export const state = {
  vistaActual: 'delante',
  colorActual: { r: 255, g: 255, b: 255 },
  imgElement: null,
  capas: [],
  nextId: 1,
  capaSeleccionadaId: null,
  presupuesto: {
    tipoEstampacion: 'serigrafia_5',
    tallas: { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
    observaciones: '',
    clienteNombre: '',
    clienteEmail: '',
    clienteTelefono: ''
  }
};