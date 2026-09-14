import { state, vistas, coloresPaleta } from './state.js';

const garmentImg = document.getElementById('garment-img');
const emptyState = document.getElementById('empty-state');
const baseImageDataCache = new Map();
const tintedImageCache = new Map();
const maxTintedImages = 8;
let tintRequestId = 0;

function obtenerClaveTinte(r, g, b) {
	return `${state.vistaActual}:${r},${g},${b}`;
}

function guardarTinteEnCache(clave, objectUrl) {
	if (tintedImageCache.has(clave)) {
		URL.revokeObjectURL(tintedImageCache.get(clave));
	}
	tintedImageCache.set(clave, objectUrl);
	while (tintedImageCache.size > maxTintedImages) {
		const primeraClave = tintedImageCache.keys().next().value;
		URL.revokeObjectURL(tintedImageCache.get(primeraClave));
		tintedImageCache.delete(primeraClave);
	}
}

function cargarPixelesBase(archivo, imagen) {
	if (baseImageDataCache.has(archivo)) {
		return baseImageDataCache.get(archivo);
	}
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	canvas.width = imagen.width;
	canvas.height = imagen.height;
	ctx.drawImage(imagen, 0, 0);
	const datos = ctx.getImageData(0, 0, canvas.width, canvas.height);
	const resultado = {
		data: new Uint8ClampedArray(datos.data),
		width: canvas.width,
		height: canvas.height
	};
	baseImageDataCache.set(archivo, resultado);
	return resultado;
}

export function cargarVista(archivo) {
	emptyState.style.display = 'flex';
	emptyState.querySelector('div').textContent = 'Cargando...';
	const img = new Image();
	img.onload = () => {
		state.imgElement = img;
		cargarPixelesBase(archivo, img);
		garmentImg.src = archivo;
		emptyState.style.display = 'none';
		const { r, g, b } = state.colorActual;
		if (r !== 255 || g !== 255 || b !== 255) aplicarTinteCamiseta(r, g, b);
	};
	img.onerror = () => {
		emptyState.style.display = 'flex';
		emptyState.querySelector('div').textContent = 'Error cargando imagen';
	};
	img.src = archivo;
}

export function aplicarTinteCamiseta(r, g, b) {
	if (!state.imgElement) return;
	const solicitudActual = ++tintRequestId;
	const clave = obtenerClaveTinte(r, g, b);
	if (tintedImageCache.has(clave)) {
		garmentImg.src = tintedImageCache.get(clave);
		return;
	}
	if (r === 255 && g === 255 && b === 255) {
		const vista = vistas.find(item => item.id === state.vistaActual);
		if (vista) garmentImg.src = vista.archivo;
		return;
	}

	const vista = vistas.find(item => item.id === state.vistaActual);
	const archivoBase = vista ? vista.archivo : state.imgElement.src;
	const imagenBase = cargarPixelesBase(archivoBase, state.imgElement);
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	canvas.width = imagenBase.width;
	canvas.height = imagenBase.height;
	const imageData = new ImageData(new Uint8ClampedArray(imagenBase.data), imagenBase.width, imagenBase.height);
	const data = imageData.data;
	for (let i = 0; i < data.length; i += 4) {
		if (data[i + 3] > 10) {
			data[i] = Math.min(255, (data[i] * r) / 255);
			data[i + 1] = Math.min(255, (data[i + 1] * g) / 255);
			data[i + 2] = Math.min(255, (data[i + 2] * b) / 255);
		}
	}
	ctx.putImageData(imageData, 0, 0);
	canvas.toBlob(blob => {
		if (!blob || solicitudActual !== tintRequestId) return;
		const objectUrl = URL.createObjectURL(blob);
		guardarTinteEnCache(clave, objectUrl);
		garmentImg.src = objectUrl;
	});
}

export function renderVistas() {
	const grid = document.getElementById('view-grid');
	grid.innerHTML = '';
	vistas.forEach(v => {
		const card = document.createElement('div');
		card.className = `view-card ${state.vistaActual === v.id ? 'active' : ''}`;
		card.innerHTML = `<img class="view-thumb" src="${v.archivo}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23ddd%22/%3E%3Ctext x=%2250%22 y=%2255%22 text-anchor=%22middle%22%3E${v.nombre}%3C/text%3E%3C/svg%3E'"><div class="view-name">${v.nombre}</div>`;
		card.addEventListener('click', () => {
			state.vistaActual = v.id;
			cargarVista(v.archivo);
			renderVistas();
		});
		grid.appendChild(card);
	});
}

export function renderPaleta() {
	const grid = document.getElementById('paleta-grid');
	grid.innerHTML = '';
	coloresPaleta.forEach(c => {
		const btn = document.createElement('div');
		btn.className = `color-btn ${state.colorActual.r === c.r && state.colorActual.g === c.g && state.colorActual.b === c.b ? 'active' : ''}`;
		btn.style.backgroundColor = `rgb(${c.r},${c.g},${c.b})`;
		btn.title = c.nombre;
		btn.addEventListener('click', () => {
			state.colorActual = { r: c.r, g: c.g, b: c.b };
			renderPaleta();
			aplicarTinteCamiseta(c.r, c.g, c.b);
		});
		grid.appendChild(btn);
	});
}
