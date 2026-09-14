import { state, blendModes } from './state.js';

const layersContainer = document.getElementById('layers-container');
const layerSettings = document.getElementById('layer-settings');

export function renderCapas() {
	const container = document.getElementById('capas-list');
	container.innerHTML = '';
	state.capas.forEach(capa => {
		const div = document.createElement('div');
		div.className = 'capa-item';
		div.style.opacity = capa.visible ? 1 : 0.5;
		div.innerHTML = `
			<span class="capa-visibilidad">${capa.visible ? '👁️' : '👁️‍🗨️'}</span>
			<div class="capa-info"><strong>${capa.tipo === 'texto' ? '📝' : '🖼️'} ${capa.nombre}</strong><br><span style="font-size:0.6rem">${capa.tipo === 'texto' ? capa.texto : ''}</span></div>
			<div class="capa-actions">
				<button class="capa-select" data-id="${capa.id}">✏️</button>
				<button class="capa-delete" data-id="${capa.id}">🗑️</button>
			</div>
		`;
		div.querySelector('.capa-visibilidad').addEventListener('click', () => {
			capa.visible = !capa.visible;
			renderCapas();
			renderLayersContainer();
		});
		div.querySelector('.capa-select').addEventListener('click', () => {
			seleccionarCapa(capa.id);
			if (capa.tipo === 'texto') {
				document.dispatchEvent(new CustomEvent('editar-texto', { detail: capa.id }));
			}
		});
		div.querySelector('.capa-delete').addEventListener('click', () => eliminarCapa(capa.id));
		container.appendChild(div);
	});
	if (state.capas.length === 0) layerSettings.style.display = 'none';
}

export function renderLayersContainer(paraExportar = false) {
	layersContainer.innerHTML = '';
	state.capas.filter(c => c.visible).forEach(capa => {
		const layerDiv = document.createElement('div');
		layerDiv.style.position = 'absolute';
		layerDiv.style.left = `calc(50% + ${capa.posX}px - ${capa.width / 2}px)`;
		layerDiv.style.top = `calc(50% + ${capa.posY}px - ${capa.height / 2}px)`;
		layerDiv.style.width = capa.width + 'px';
		layerDiv.style.height = capa.height + 'px';
		layerDiv.style.opacity = capa.opacidad / 100;
		layerDiv.style.transform = `rotate(${capa.rotacion}deg)`;
		layerDiv.style.mixBlendMode = capa.blendMode;

		if (capa.tipo === 'texto') {
			const textDiv = document.createElement('div');
			textDiv.style.width = '100%';
			textDiv.style.height = '100%';
			textDiv.style.display = 'flex';
			textDiv.style.alignItems = 'center';
			textDiv.style.justifyContent = 'center';
			textDiv.style.fontFamily = capa.fontFamily;
			textDiv.style.fontSize = capa.fontSize + 'px';
			textDiv.style.color = capa.color;
			textDiv.style.fontWeight = 'bold';
			textDiv.style.textAlign = 'center';
			textDiv.style.lineHeight = '1.2';
			textDiv.textContent = capa.texto;
			layerDiv.appendChild(textDiv);
		} else {
			const img = document.createElement('img');
			img.src = capa.src;
			img.style.width = '100%';
			img.style.height = '100%';
			img.style.objectFit = 'contain';
			img.style.pointerEvents = 'none';
			if (capa.tint) {
				img.style.filter = `brightness(0) saturate(100%) invert(1) sepia(1) hue-rotate(${obtenerHueRotate(capa.tint.r, capa.tint.g, capa.tint.b)}deg) saturate(500%)`;
			}
			layerDiv.appendChild(img);
		}

		if (!paraExportar) {
			const frame = document.createElement('div');
			frame.className = 'layer-frame';
			frame.style.position = 'absolute';
			frame.style.inset = '0';
			frame.style.border = '0';
			frame.style.pointerEvents = 'none';
			frame.style.opacity = state.capaSeleccionadaId === capa.id ? '1' : '0';
			layerDiv.appendChild(frame);

			layerDiv.addEventListener('mousedown', e => {
				if (e.target === frame || e.target === layerDiv || e.target.tagName === 'IMG') {
					iniciarArrastre(e, capa.id);
					seleccionarCapa(capa.id);
					e.stopPropagation();
				}
			});
		}

		layersContainer.appendChild(layerDiv);
	});
}

function obtenerHueRotate(r, g, b) {
	r /= 255; g /= 255; b /= 255;
	const max = Math.max(r, g, b), min = Math.min(r, g, b);
	let h = 0;
	if (max !== min) {
		const d = max - min;
		switch (max) {
			case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
			case g: h = ((b - r) / d + 2) / 6; break;
			case b: h = ((r - g) / d + 4) / 6; break;
		}
	}
	return Math.round(h * 360);
}

export function seleccionarCapa(id) {
	state.capaSeleccionadaId = id;
	const capa = state.capas.find(c => c.id === id);
	if (capa) {
		layerSettings.style.display = 'block';
		document.getElementById('layer-size').value = capa.tamano;
		document.getElementById('layer-val-size').textContent = capa.tamano + '%';
		document.getElementById('layer-posx').value = capa.posX;
		document.getElementById('layer-val-x').textContent = capa.posX + 'px';
		document.getElementById('layer-posy').value = capa.posY;
		document.getElementById('layer-val-y').textContent = capa.posY + 'px';
		document.getElementById('layer-opacity').value = capa.opacidad;
		document.getElementById('layer-val-opacity').textContent = capa.opacidad + '%';
		document.getElementById('layer-rotation').value = capa.rotacion;
		document.getElementById('layer-val-rotation').textContent = capa.rotacion + '°';
		renderLayerBlend(capa.blendMode);
		renderLayerTint(capa.tint ?? null);
	}
	renderCapas();
	renderLayersContainer(false);
}

export function actualizarCapaSeleccionada(prop, valor) {
	const capa = state.capas.find(c => c.id === state.capaSeleccionadaId);
	if (capa) {
		capa[prop] = valor;
		if (prop === 'tamano') {
			const proporcion = capa.aspectRatio || 1;
			const baseW = capa.tipo === 'texto' ? 150 : 120;
			capa.width = baseW * (valor / 100);
			capa.height = capa.width / proporcion;
		}
		renderLayersContainer(false);
	}
}

export function obtenerCapa(id) {
	return state.capas.find(capa => capa.id === id);
}

export function actualizarTexto(id, datos) {
	const capa = obtenerCapa(id);
	if (!capa || capa.tipo !== 'texto') return;
	Object.assign(capa, datos);
	capa.nombre = capa.texto.substring(0, 20);
	renderCapas();
	renderLayersContainer(false);
}

export function eliminarCapa(id) {
	state.capas = state.capas.filter(c => c.id !== id);
	if (state.capaSeleccionadaId === id) {
		state.capaSeleccionadaId = null;
		layerSettings.style.display = 'none';
	}
	renderCapas();
	renderLayersContainer(false);
}

export function agregarCapa(tipo, datos) {
	const baseW = tipo === 'texto' ? 150 : 120;
	const baseH = tipo === 'texto' ? 60 : 120;
	const aspectRatio = datos.aspectRatio || 1;
	const nuevaCapa = {
		id: state.nextId++,
		tipo,
		nombre: datos.nombre,
		visible: true,
		posX: 0,
		posY: 0,
		tamano: 100,
		width: baseW,
		height: tipo === 'logo' ? baseW / aspectRatio : baseH,
		aspectRatio,
		opacidad: 100,
		rotacion: 0,
		blendMode: 'normal',
		...datos
	};
	state.capas.push(nuevaCapa);
	seleccionarCapa(nuevaCapa.id);
	renderCapas();
	renderLayersContainer(false);
}

function renderLayerBlend(selected) {
	const row = document.getElementById('layer-blend');
	if (!row) return;
	const modoActual = selected || 'normal';
	row.innerHTML = '';
	blendModes.forEach(m => {
		const btn = document.createElement('button');
		btn.className = `blend-btn ${modoActual === m ? 'active' : ''}`;
		btn.textContent = m;
		btn.addEventListener('click', () => {
			actualizarCapaSeleccionada('blendMode', m);
			renderLayerBlend(m);
		});
		row.appendChild(btn);
	});
}

const tintColores = [
	{ nombre: 'Sin tinte', r: null, g: null, b: null, css: 'transparent', pattern: true },
	{ nombre: 'Negro', r: 0, g: 0, b: 0, css: '#000000' },
	{ nombre: 'Rojo', r: 220, g: 0, b: 46, css: '#DC002E' },
	{ nombre: 'Azul', r: 0, g: 96, b: 169, css: '#0060A9' },
	{ nombre: 'Amarillo', r: 255, g: 200, b: 0, css: '#FFC800' }
];

function renderLayerTint(tintActual) {
	const row = document.getElementById('layer-tint');
	if (!row) return;
	row.innerHTML = '';
	tintColores.forEach(t => {
		const sw = document.createElement('div');
		sw.className = 'tint-swatch';
		sw.title = t.nombre;
		if (t.pattern) {
			sw.style.cssText = `background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%); background-size: 8px 8px; background-position: 0 0, 0 4px, 4px -4px, -4px 0px; background-color: white;`;
		} else {
			sw.style.backgroundColor = t.css;
		}
		const esActivo = tintActual
			? tintActual.r === t.r && tintActual.g === t.g && tintActual.b === t.b
			: t.pattern;
		if (esActivo) {
			sw.style.outline = '2px solid var(--accent)';
			sw.style.outlineOffset = '2px';
		}
		sw.addEventListener('click', () => {
			const capa = state.capas.find(c => c.id === state.capaSeleccionadaId);
			if (!capa) return;
			capa.tint = t.pattern ? null : { r: t.r, g: t.g, b: t.b };
			renderLayerTint(capa.tint);
			renderLayersContainer(false);
		});
		row.appendChild(sw);
	});
}

let dragActive = false;
let dragCapaId = null;
let dragStartX;
let dragStartY;
let dragStartPosX;
let dragStartPosY;

function iniciarArrastre(e, capaId) {
	dragActive = true;
	dragCapaId = capaId;
	const capa = state.capas.find(c => c.id === capaId);
	dragStartX = e.clientX;
	dragStartY = e.clientY;
	dragStartPosX = capa.posX;
	dragStartPosY = capa.posY;
	e.preventDefault();
}

document.addEventListener('mousemove', e => {
	if (!dragActive) return;
	const capa = state.capas.find(c => c.id === dragCapaId);
	if (capa) {
		capa.posX = dragStartPosX + (e.clientX - dragStartX);
		capa.posY = dragStartPosY + (e.clientY - dragStartY);
		if (state.capaSeleccionadaId === dragCapaId) {
			document.getElementById('layer-posx').value = capa.posX;
			document.getElementById('layer-val-x').textContent = capa.posX + 'px';
			document.getElementById('layer-posy').value = capa.posY;
			document.getElementById('layer-val-y').textContent = capa.posY + 'px';
		}
		renderLayersContainer(false);
	}
});

document.addEventListener('mouseup', () => { dragActive = false; });

document.getElementById('layer-size').addEventListener('input', e => {
	document.getElementById('layer-val-size').textContent = e.target.value + '%';
	actualizarCapaSeleccionada('tamano', parseInt(e.target.value));
});

document.getElementById('layer-posx').addEventListener('input', e => {
	document.getElementById('layer-val-x').textContent = e.target.value + 'px';
	actualizarCapaSeleccionada('posX', parseInt(e.target.value));
});

document.getElementById('layer-posy').addEventListener('input', e => {
	document.getElementById('layer-val-y').textContent = e.target.value + 'px';
	actualizarCapaSeleccionada('posY', parseInt(e.target.value));
});

document.getElementById('layer-opacity').addEventListener('input', e => {
	document.getElementById('layer-val-opacity').textContent = e.target.value + '%';
	actualizarCapaSeleccionada('opacidad', parseInt(e.target.value));
});

document.getElementById('layer-rotation').addEventListener('input', e => {
	document.getElementById('layer-val-rotation').textContent = e.target.value + '°';
	actualizarCapaSeleccionada('rotacion', parseInt(e.target.value));
});
