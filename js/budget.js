import { state, vistas, coloresPaleta } from './state.js';

const tiposEstampacion = {
	serigrafia_1: 'Serigrafía 1 color',
	serigrafia_2: 'Serigrafía 2 colores',
	serigrafia_3: 'Serigrafía 3 colores',
	serigrafia_4: 'Serigrafía 4 colores',
	serigrafia_5: 'Serigrafía 5 colores',
	serigrafia_cmyk: 'Serigrafía en cuatricromía (CMYK)',
	dtf: 'DTF (Direct to Film)',
	sublimacion: 'Sublimación',
	bordado: 'Bordado'
};

function showToast(msg, success = true) {
	const toast = document.getElementById('toast');
	toast.textContent = msg;
	toast.className = `toast show ${success ? 'success' : ''}`;
	setTimeout(() => { toast.className = 'toast'; }, 2500);
}

export function actualizarTotalUnidades() {
	const tallas = ['xs', 's', 'm', 'l', 'xl', 'xxl'];
	const total = tallas.reduce((suma, talla) => {
		return suma + (parseInt(document.getElementById(`talla-${talla}`)?.value) || 0);
	}, 0);
	document.getElementById('total-unidades').textContent = total;
	return total;
}

export function sincronizarEstadoPresupuesto() {
	state.presupuesto.tipoEstampacion = document.getElementById('tipo-estampacion').value;
	state.presupuesto.tallas = {
		XS: parseInt(document.getElementById('talla-xs')?.value) || 0,
		S: parseInt(document.getElementById('talla-s')?.value) || 0,
		M: parseInt(document.getElementById('talla-m')?.value) || 0,
		L: parseInt(document.getElementById('talla-l')?.value) || 0,
		XL: parseInt(document.getElementById('talla-xl')?.value) || 0,
		XXL: parseInt(document.getElementById('talla-xxl')?.value) || 0
	};
	state.presupuesto.observaciones = document.getElementById('observaciones')?.value || '';
	state.presupuesto.clienteNombre = document.getElementById('cliente-nombre')?.value || '';
	state.presupuesto.clienteEmail = document.getElementById('cliente-email')?.value || '';
	state.presupuesto.clienteTelefono = document.getElementById('cliente-telefono')?.value || '';
}

export function obtenerNombreColor(r, g, b) {
	const color = coloresPaleta.find(item => item.r === r && item.g === g && item.b === b);
	return color ? color.nombre : `RGB(${r},${g},${b})`;
}

async function capturarDiseño() {
	const frames = document.querySelectorAll('.layer-frame');
	frames.forEach(frame => { frame.style.opacity = '0'; });
	try {
		return await html2canvas(document.getElementById('canvas-container'), {
			backgroundColor: '#ffffff',
			scale: 2,
			useCORS: true
		});
	} finally {
		frames.forEach(frame => { frame.style.opacity = '1'; });
	}
}

function crearReferencia() {
	const hoy = new Date();
	const fecha = hoy.getFullYear().toString() +
		(hoy.getMonth() + 1).toString().padStart(2, '0') +
		hoy.getDate().toString().padStart(2, '0');
	const ref = `PRE-${fecha}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
	return { hoy, ref };
}

function dibujarTablaTallas(pdf, x, y) {
	const tallas = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
	const cantidades = tallas.map(talla => state.presupuesto.tallas[talla]);
	const ancho = 25;

	pdf.setFontSize(11);
	pdf.setTextColor(0, 0, 0);
	pdf.text('CANTIDADES POR TALLA', x, y - 7);
	pdf.setFontSize(9);
	tallas.forEach((talla, indice) => {
		const posicion = x + indice * ancho;
		pdf.setFillColor(240, 240, 240);
		pdf.rect(posicion, y, ancho, 8, 'F');
		pdf.rect(posicion, y, ancho, 8);
		pdf.text(talla, posicion + 8, y + 6);
		pdf.rect(posicion, y + 8, ancho, 8);
		pdf.text(cantidades[indice].toString(), posicion + 10, y + 14);
	});
	pdf.text(`Total unidades: ${cantidades.reduce((a, b) => a + b, 0)}`, x, y + 26);
}

export async function generarSolicitudPDF() {
	sincronizarEstadoPresupuesto();
	showToast('Generando solicitud...', true);
	const canvas = await capturarDiseño();
	const imagen = canvas.toDataURL('image/png');
	const { hoy, ref } = crearReferencia();
	const vista = vistas.find(item => item.id === state.vistaActual);
	const { jsPDF } = window.jspdf;
	const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

	pdf.setFont('helvetica');
	pdf.setFontSize(18);
	pdf.setTextColor(200, 82, 26);
	pdf.text('SOLICITUD DE PRESUPUESTO', 20, 25);
	pdf.setFontSize(9);
	pdf.setTextColor(100, 100, 100);
	pdf.text(`Referencia: ${ref}`, 20, 35);
	pdf.text(`Fecha: ${hoy.toLocaleDateString('es-ES')}`, 20, 41);
	pdf.setDrawColor(200, 200, 200);
	pdf.line(20, 48, 190, 48);
	pdf.setFontSize(11);
	pdf.setTextColor(0, 0, 0);
	pdf.text('DISEÑO PRESENTADO', 20, 58);
	pdf.addImage(imagen, 'PNG', 20, 63, 70, 70);
	pdf.text('DATOS DEL ESTAMPADO', 110, 58);
	pdf.setFontSize(9);
	pdf.text(`Prenda: ${vista ? vista.nombre : state.vistaActual}`, 110, 70);
	pdf.text(`Color: ${obtenerNombreColor(state.colorActual.r, state.colorActual.g, state.colorActual.b)}`, 110, 78);
	pdf.text(`Estampación: ${tiposEstampacion[state.presupuesto.tipoEstampacion] || state.presupuesto.tipoEstampacion}`, 110, 86);
	dibujarTablaTallas(pdf, 20, 162);
	pdf.setFontSize(11);
	pdf.setTextColor(0, 0, 0);
	pdf.text('DATOS DEL CLIENTE', 20, 210);
	pdf.setFontSize(9);
	pdf.text(`Nombre: ${state.presupuesto.clienteNombre || '[No especificado]'}`, 20, 220);
	pdf.text(`Email: ${state.presupuesto.clienteEmail || '[No especificado]'}`, 20, 228);
	pdf.text(`Teléfono: ${state.presupuesto.clienteTelefono || '[No especificado]'}`, 20, 236);
	if (state.presupuesto.observaciones) {
		pdf.text('Observaciones:', 20, 250);
		pdf.text(pdf.splitTextToSize(state.presupuesto.observaciones, 170), 20, 258);
	}
	pdf.setFontSize(8);
	pdf.setTextColor(150, 150, 150);
	pdf.text('sergiformador.es - Solicitud de presupuesto', 20, 280);
	pdf.save(`solicitud-${ref}.pdf`);
	showToast('Solicitud PDF generada', true);
	return { pdf, ref, imagenDataURL: imagen };
}

export async function generarSolicitudPDFDataURL() {
	sincronizarEstadoPresupuesto();
	const canvas = await capturarDiseño();
	const imagen = canvas.toDataURL('image/png');
	const { hoy, ref } = crearReferencia();
	const vista = vistas.find(item => item.id === state.vistaActual);
	const { jsPDF } = window.jspdf;
	const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	pdf.setFontSize(18);
	pdf.setTextColor(200, 82, 26);
	pdf.text('SOLICITUD DE PRESUPUESTO', 20, 25);
	pdf.setFontSize(10);
	pdf.setTextColor(100, 100, 100);
	pdf.text(`Referencia: ${ref}`, 20, 35);
	pdf.text(`Fecha: ${hoy.toLocaleDateString('es-ES')}`, 20, 42);
	pdf.setDrawColor(200, 200, 200);
	pdf.line(20, 48, 190, 48);
	pdf.setTextColor(0, 0, 0);
	pdf.text('DISEÑO PRESENTADO', 20, 60);
	pdf.addImage(imagen, 'PNG', 20, 65, 70, 70);
	pdf.text('DATOS DEL ESTAMPADO', 110, 60);
	pdf.setFontSize(9);
	pdf.text(`Prenda: ${vista ? vista.nombre : state.vistaActual}`, 110, 70);
	pdf.text(`Color: ${obtenerNombreColor(state.colorActual.r, state.colorActual.g, state.colorActual.b)}`, 110, 78);
	pdf.text(`Estampación: ${tiposEstampacion[state.presupuesto.tipoEstampacion] || state.presupuesto.tipoEstampacion}`, 110, 86);
	dibujarTablaTallas(pdf, 20, 162);
	pdf.text('DATOS DEL CLIENTE', 20, 210);
	pdf.setFontSize(9);
	pdf.text(`Nombre: ${state.presupuesto.clienteNombre || '[No especificado]'}`, 20, 220);
	pdf.text(`Email: ${state.presupuesto.clienteEmail || '[No especificado]'}`, 20, 228);
	pdf.text(`Teléfono: ${state.presupuesto.clienteTelefono || '[No especificado]'}`, 20, 236);
	if (state.presupuesto.observaciones) {
		pdf.text('Observaciones:', 20, 250);
		pdf.text(pdf.splitTextToSize(state.presupuesto.observaciones, 170), 20, 258);
	}
	pdf.setFontSize(8);
	pdf.setTextColor(150, 150, 150);
	pdf.text('sergiformador.es - Solicitud de presupuesto', 20, 280);
	return pdf.output('datauristring');
}

const tallasInputs = ['talla-xs', 'talla-s', 'talla-m', 'talla-l', 'talla-xl', 'talla-xxl'];
tallasInputs.forEach(id => {
	document.getElementById(id)?.addEventListener('input', () => {
		actualizarTotalUnidades();
		sincronizarEstadoPresupuesto();
	});
});
document.getElementById('tipo-estampacion')?.addEventListener('change', sincronizarEstadoPresupuesto);
document.getElementById('observaciones')?.addEventListener('input', sincronizarEstadoPresupuesto);
document.getElementById('cliente-nombre')?.addEventListener('input', sincronizarEstadoPresupuesto);
document.getElementById('cliente-email')?.addEventListener('input', sincronizarEstadoPresupuesto);
document.getElementById('cliente-telefono')?.addEventListener('input', sincronizarEstadoPresupuesto);
document.getElementById('btn-generar-solicitud')?.addEventListener('click', async () => {
	if (state.capas.length === 0 && !state.imgElement) {
		showToast('Diseña algo antes de generar la solicitud', false);
		return;
	}
	await generarSolicitudPDF();
});
actualizarTotalUnidades();
