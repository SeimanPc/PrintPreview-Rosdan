export async function exportarImagen() {
	const frames = document.querySelectorAll('.layer-frame');
	frames.forEach(frame => { frame.style.opacity = '0'; });

	try {
		const container = document.getElementById('canvas-container');
		return await html2canvas(container, {
			backgroundColor: '#ffffff',
			scale: 2,
			useCORS: true
		});
	} finally {
		frames.forEach(frame => { frame.style.opacity = '1'; });
	}
}

export async function descargarPNG(nombre = 'boceto-camiseta.png') {
	const canvas = await exportarImagen();
	const enlace = document.createElement('a');
	enlace.download = nombre;
	enlace.href = canvas.toDataURL('image/png');
	enlace.click();
	return canvas;
}

export async function exportarPDF(nombre = 'boceto-produccion.pdf') {
	const canvas = await exportarImagen();
	const imgData = canvas.toDataURL('image/png');
	const { jsPDF } = window.jspdf;
	const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	const imgWidth = 190;
	const imgHeight = (canvas.height * imgWidth) / canvas.width;
	pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
	pdf.save(nombre);
	return pdf;
}
