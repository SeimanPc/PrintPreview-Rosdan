import { state } from './state.js';
import { generarSolicitudPDFDataURL, sincronizarEstadoPresupuesto, actualizarTotalUnidades } from './budget.js';
import { exportarImagen } from './export.js';

let toastTimer;

function showToast(msg, success = true, duration = 2500) {
	const toast = document.getElementById('toast');
	clearTimeout(toastTimer);
	toast.textContent = msg;
	toast.className = `toast show ${success ? 'success' : ''}`;
	if (duration > 0) {
		toastTimer = setTimeout(() => { toast.className = 'toast'; }, duration);
	}
}

function emailValido(email) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function enviarSolicitudEmail() {
	sincronizarEstadoPresupuesto();
	const emailCliente = state.presupuesto.clienteEmail;
	if (!emailCliente) {
		showToast('Introduce tu email en "Datos del cliente"', false);
		return;
	}
	if (!emailValido(emailCliente)) {
		showToast('Email del cliente no válido', false);
		return;
	}
	if (actualizarTotalUnidades() === 0) {
		showToast('Indica al menos una cantidad en alguna talla', false);
		return;
	}

	showToast('Generando PDF...', true);
	try {
		const pdfDataURL = await generarSolicitudPDFDataURL();
		if (!pdfDataURL || pdfDataURL.length < 1000) {
			showToast('Error al generar el PDF', false);
			return;
		}
		const formData = new FormData();
		formData.append('email', emailCliente);
		formData.append('asunto', 'Solicitud de presupuesto');
		formData.append('mensaje', 'Adjunto encontrarás el PDF con la solicitud de presupuesto completa.');
		formData.append('pdf_base64', pdfDataURL.split(',')[1]);
		await enviarFormulario(formData, 'Solicitud enviada correctamente');
	} catch (error) {
		console.error('Error enviando solicitud:', error);
		showToast(error.message || 'Error de conexión', false);
	}
}

async function enviarFormulario(formData, mensajeExito) {
	showToast('Enviando... El servidor puede tardar unos segundos.', true, 0);
	const response = await fetch('enviar_email.php', {
		method: 'POST',
		body: formData
	});
	const respuestaTexto = await response.text();
	let result;
	try {
		result = JSON.parse(respuestaTexto);
	} catch {
		throw new Error(`El servidor respondió con HTTP ${response.status}, pero no devolvió JSON`);
	}
	if (!response.ok) {
		throw new Error(result.error || `El servidor respondió con HTTP ${response.status}`);
	}
	if (result.success) {
		showToast(`✅ ${mensajeExito}`, true, 8000);
	} else {
		throw new Error(result.error || 'No se pudo enviar');
	}
}

const modalEnvio = document.getElementById('modal-envio');

document.getElementById('btn-email-image')?.addEventListener('click', async () => {
	if (state.capas.length === 0 && !state.imgElement) {
		showToast('Añade un logo o texto antes de enviar', false);
		return;
	}
	showToast('Preparando imagen...', true);
	try {
		const canvas = await exportarImagen();
		state.imagenParaEnvio = canvas.toDataURL('image/png');
		modalEnvio.classList.add('open');
		document.getElementById('envio-email').value = '';
		document.getElementById('envio-asunto').value = 'Boceto de estampado - PrintPreview';
		document.getElementById('envio-mensaje').value = 'Adjunto encontrarás el boceto de cómo quedaría el estampado en la prenda.\n\nQuedo a tu disposición para cualquier ajuste.';
	} catch (error) {
		console.error('Error preparando imagen:', error);
		showToast('No se pudo preparar la imagen', false);
	}
});

document.getElementById('modal-envio-cancel')?.addEventListener('click', () => {
	modalEnvio.classList.remove('open');
});

document.getElementById('modal-envio-enviar')?.addEventListener('click', async () => {
	const email = document.getElementById('envio-email').value.trim();
	if (!email) {
		showToast('Introduce un email destinatario', false);
		return;
	}
	if (!emailValido(email)) {
		showToast('Email no válido', false);
		return;
	}
	const formData = new FormData();
	formData.append('email', email);
	formData.append('asunto', document.getElementById('envio-asunto').value);
	formData.append('mensaje', document.getElementById('envio-mensaje').value);
	formData.append('imagen', state.imagenParaEnvio);
	try {
		await enviarFormulario(formData, 'Email enviado correctamente a ' + email);
		modalEnvio.classList.remove('open');
	} catch (error) {
		console.error('Error enviando imagen:', error);
		showToast(error.message || 'Error de conexión con el servidor', false);
	}
});

document.getElementById('btn-enviar-solicitud')?.addEventListener('click', async () => {
	const boton = document.getElementById('btn-enviar-solicitud');
	if (boton.disabled) {
		return;
	}
	if (state.capas.length === 0 && !state.imgElement) {
		showToast('Diseña algo antes de enviar la solicitud', false);
		return;
	}
	boton.disabled = true;
	try {
		await enviarSolicitudEmail();
	} finally {
		boton.disabled = false;
	}
});
