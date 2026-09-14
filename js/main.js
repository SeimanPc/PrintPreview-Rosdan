import { state, vistas, coloresPaleta } from './state.js';
import {
  renderCapas,
  renderLayersContainer,
  seleccionarCapa,
  actualizarCapaSeleccionada,
  agregarCapa,
  obtenerCapa,
  actualizarTexto
} from './layers.js';
import { cargarVista, renderVistas, renderPaleta } from './garment.js';
import { descargarPNG, exportarPDF } from './export.js';
import './budget.js';
import './email.js';
 
    // ==================== DOM ====================
    const toolbarHint = document.getElementById('toolbar-hint');
    // ==================== LOGOS ====================
    document.getElementById('btn-add-logo').addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = e => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = ev => {
            const img = new Image();
            img.onload = () => {
              agregarCapa('logo', {
                nombre: file.name,
                src: ev.target.result,
                aspectRatio: img.width / img.height
              });
            };
            img.src = ev.target.result;
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    });

    // ==================== TEXTOS ====================
    const modalTexto = document.getElementById('modal-texto');
    let textoEditandoId = null;
    function prepararNuevoTexto() {
      textoEditandoId = null;
      modalTexto.querySelector('h3').textContent = '✏️ Nuevo texto';
      document.getElementById('modal-texto-ok').textContent = 'Añadir';
      document.getElementById('texto-contenido').value = '';
      document.getElementById('texto-size').value = 36;
      document.getElementById('texto-size-val').textContent = '36px';
    }

    document.getElementById('btn-add-texto').addEventListener('click', () => {
      prepararNuevoTexto();
      modalTexto.classList.add('open');
    });
    document.getElementById('modal-texto-cancel').addEventListener('click', () => {
      prepararNuevoTexto();
      modalTexto.classList.remove('open');
    });
    document.addEventListener('editar-texto', event => {
      const capa = obtenerCapa(event.detail);
      if (!capa) return;
      textoEditandoId = capa.id;
      document.getElementById('texto-contenido').value = capa.texto;
      document.getElementById('texto-color').value = capa.color;
      document.getElementById('texto-font').value = capa.fontFamily;
      document.getElementById('texto-size').value = capa.fontSize;
      document.getElementById('texto-size-val').textContent = capa.fontSize + 'px';
      modalTexto.querySelector('h3').textContent = '✏️ Editar texto';
      document.getElementById('modal-texto-ok').textContent = 'Guardar';
      modalTexto.classList.add('open');
    });
    document.getElementById('modal-texto-ok').addEventListener('click', () => {
      const texto = document.getElementById('texto-contenido').value.trim();
      if (!texto) { showToast('Escribe un texto', false); return; }
      const datosTexto = {
        texto,
        color: document.getElementById('texto-color').value,
        fontFamily: document.getElementById('texto-font').value,
        fontSize: parseInt(document.getElementById('texto-size').value)
      };
      if (textoEditandoId !== null) {
        actualizarTexto(textoEditandoId, datosTexto);
        textoEditandoId = null;
      } else {
        agregarCapa('texto', { nombre: texto.substring(0, 20), ...datosTexto });
      }
      modalTexto.classList.remove('open');
      document.getElementById('texto-contenido').value = '';
      modalTexto.querySelector('h3').textContent = '✏️ Nuevo texto';
      document.getElementById('modal-texto-ok').textContent = 'Añadir';
    });
    document.getElementById('texto-size').addEventListener('input', e => document.getElementById('texto-size-val').textContent = e.target.value + 'px');

    // ==================== BOTONES ====================
    document.getElementById('btn-reset-pos').addEventListener('click', () => {
      if (state.capaSeleccionadaId) {
        const capa = state.capas.find(c => c.id === state.capaSeleccionadaId);
        if (capa) { capa.posX = 0; capa.posY = 0; capa.tamano = 100; capa.opacidad = 100; capa.rotacion = 0; actualizarCapaSeleccionada('tamano', 100); renderLayersContainer(false); showToast('Capa reiniciada', true); }
      }
    });

    document.getElementById('btn-download').addEventListener('click', async () => {
      await descargarPNG();
      showToast('PNG descargado', true);
    });

    document.getElementById('btn-export-pdf').addEventListener('click', async () => {
      showToast('Generando PDF...', true);
      await exportarPDF();
      showToast('PDF generado', true);
    });

    function showToast(msg, success = true) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.className = `toast show ${success ? 'success' : ''}`;
      setTimeout(() => t.className = 'toast', 2500);
    }

    // ==================== GENERAR PDF DE SOLICITUD ====================
    async function generarSolicitudPDF() {
      showToast('Generando solicitud...', true);

      // Sincronizar datos del presupuesto
      sincronizarEstadoPresupuesto();

      // Obtener el nombre del color seleccionado
      const colorNombre = obtenerNombreColor(state.colorActual.r, state.colorActual.g, state.colorActual.b);

      // Obtener el nombre de la vista actual
      const vistaActualObj = vistas.find(v => v.id === state.vistaActual);
      const nombreVista = vistaActualObj ? vistaActualObj.nombre : state.vistaActual;

      // Obtener el tipo de estampación legible
      const tiposEstampacion = {
        'serigrafia_1': 'Serigrafía 1 color',
        'serigrafia_2': 'Serigrafía 2 colores',
        'serigrafia_3': 'Serigrafía 3 colores',
        'serigrafia_4': 'Serigrafía 4 colores',
        'serigrafia_5': 'Serigrafía 5 colores',
        'serigrafia_cmyk': 'Serigrafía en cuatricromía (CMYK)',
        'dtf': 'DTF (Direct to Film)',
        'sublimacion': 'Sublimación',
        'bordado': 'Bordado'
      };
      const tipoEstampacionTexto = tiposEstampacion[state.presupuesto.tipoEstampacion] || state.presupuesto.tipoEstampacion;

      // Generar número de referencia único
      const hoy = new Date();
      const fechaStr = hoy.getFullYear().toString() +
        (hoy.getMonth() + 1).toString().padStart(2, '0') +
        hoy.getDate().toString().padStart(2, '0');
      const ref = `PRE-${fechaStr}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

      // Generar la imagen del diseño (sin bordes)
      const frames = document.querySelectorAll('.layer-frame');
      frames.forEach(f => f.style.opacity = '0');
      const container = document.getElementById('canvas-container');
      const canvas = await html2canvas(container, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
      frames.forEach(f => f.style.opacity = '1');
      const imagenDataURL = canvas.toDataURL('image/png');

      // Crear PDF con jsPDF
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Configurar fuentes y colores
      pdf.setFont('helvetica');

      // ========== ENCABEZADO ==========
      pdf.setFontSize(18);
      pdf.setTextColor(200, 82, 26); // Color naranja/accent
      pdf.text('SOLICITUD DE PRESUPUESTO', 20, 25);

      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Referencia: ${ref}`, 20, 35);
      pdf.text(`Fecha: ${hoy.toLocaleDateString('es-ES')}`, 20, 41);

      // Línea separadora
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, 48, 190, 48);

      // ========== DISEÑO ==========
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      pdf.text('DISEÑO PRESENTADO', 20, 58);

      // Insertar imagen del diseño
      try {
        const imgWidth = 70;
        const imgHeight = 70;
        pdf.addImage(imagenDataURL, 'PNG', 20, 63, imgWidth, imgHeight);
      } catch (e) {
        console.error('Error al añadir imagen al PDF:', e);
        pdf.text('[Imagen del diseño]', 20, 63);
      }

      // ========== DATOS DEL ESTAMPADO ==========
      pdf.setFontSize(11);
      pdf.text('DATOS DEL ESTAMPADO', 110, 58);

      pdf.setFontSize(9);
      pdf.setTextColor(80, 80, 80);
      pdf.text('Prenda seleccionada:', 110, 68);
      pdf.setTextColor(0, 0, 0);
      pdf.text(nombreVista, 110, 75);

      pdf.setTextColor(80, 80, 80);
      pdf.text('Color seleccionado:', 110, 85);
      pdf.setTextColor(0, 0, 0);
      pdf.text(colorNombre, 110, 92);

      pdf.setTextColor(80, 80, 80);
      pdf.text('Tipo de estampación:', 110, 102);
      pdf.setTextColor(0, 0, 0);
      pdf.text(tipoEstampacionTexto, 110, 109);

      // ========== TABLA DE TALLAS ==========
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      pdf.text('CANTIDADES POR TALLA', 20, 148);

      // Dibujar tabla manual
      const tallas = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
      const cantidades = [
        state.presupuesto.tallas.XS,
        state.presupuesto.tallas.S,
        state.presupuesto.tallas.M,
        state.presupuesto.tallas.L,
        state.presupuesto.tallas.XL,
        state.presupuesto.tallas.XXL
      ];
      const totalUnidades = cantidades.reduce((a, b) => a + b, 0);

      let xInicio = 20;
      let yInicio = 155;
      let anchoCelda = 25;

      // Encabezados de tabla
      pdf.setFillColor(240, 240, 240);
      pdf.rect(xInicio, yInicio, anchoCelda * tallas.length, 8, 'F');
      pdf.setDrawColor(180, 180, 180);
      for (let i = 0; i <= tallas.length; i++) {
        pdf.line(xInicio + (i * anchoCelda), yInicio, xInicio + (i * anchoCelda), yInicio + 8);
      }
      pdf.line(xInicio, yInicio, xInicio + anchoCelda * tallas.length, yInicio);
      pdf.line(xInicio, yInicio + 8, xInicio + anchoCelda * tallas.length, yInicio + 8);

      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      for (let i = 0; i < tallas.length; i++) {
        pdf.text(tallas[i], xInicio + (i * anchoCelda) + 8, yInicio + 6);
      }

      // Filas de cantidades
      let yActual = yInicio + 8;
      pdf.setFillColor(255, 255, 255);
      pdf.rect(xInicio, yActual, anchoCelda * tallas.length, 8, 'F');
      for (let i = 0; i <= tallas.length; i++) {
        pdf.line(xInicio + (i * anchoCelda), yActual, xInicio + (i * anchoCelda), yActual + 8);
      }
      pdf.line(xInicio, yActual, xInicio + anchoCelda * tallas.length, yActual);
      pdf.line(xInicio, yActual + 8, xInicio + anchoCelda * tallas.length, yActual + 8);

      for (let i = 0; i < cantidades.length; i++) {
        pdf.text(cantidades[i].toString(), xInicio + (i * anchoCelda) + 8, yActual + 6);
      }

      // Total
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Total unidades: ${totalUnidades}`, 20, yActual + 18);

      // ========== OBSERVACIONES ==========
      if (state.presupuesto.observaciones) {
        pdf.setFontSize(11);
        pdf.text('OBSERVACIONES', 20, yActual + 35);
        pdf.setFontSize(9);
        pdf.setTextColor(80, 80, 80);
        const observacionesLines = pdf.splitTextToSize(state.presupuesto.observaciones, 160);
        pdf.text(observacionesLines, 20, yActual + 45);
      }

      // ========== DATOS DEL CLIENTE ==========
      let yObs = yActual + 45 + (state.presupuesto.observaciones ? 20 : 0);
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      pdf.text('DATOS DEL CLIENTE', 20, yObs);

      pdf.setFontSize(9);
      pdf.setTextColor(80, 80, 80);
      pdf.text('Nombre:', 20, yObs + 10);
      pdf.setTextColor(0, 0, 0);
      pdf.text(state.presupuesto.clienteNombre || '[No especificado]', 20, yObs + 17);

      pdf.setTextColor(80, 80, 80);
      pdf.text('Email:', 20, yObs + 27);
      pdf.setTextColor(0, 0, 0);
      pdf.text(state.presupuesto.clienteEmail || '[No especificado]', 20, yObs + 34);

      pdf.setTextColor(80, 80, 80);
      pdf.text('Teléfono:', 20, yObs + 44);
      pdf.setTextColor(0, 0, 0);
      pdf.text(state.presupuesto.clienteTelefono || '[No especificado]', 20, yObs + 51);

      // ========== PIE DE PÁGINA ==========
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('Este documento es una solicitud de presupuesto. sergiformador.es', 20, 285);

      // Guardar el PDF
      pdf.save(`solicitud-${ref}.pdf`);
      showToast('Solicitud PDF generada', true);

      return { pdf, ref, imagenDataURL };
    }

    // Función auxiliar para obtener el nombre del color
    function obtenerNombreColor(r, g, b) {
      const color = coloresPaleta.find(c => c.r === r && c.g === g && c.b === b);
      if (color) {
        return color.nombre;
      }
      return `RGB(${r},${g},${b})`;
    }

    // ==================== FUNCIONES DEL PRESUPUESTO ====================
    function actualizarTotalUnidades() {
      const tallas = ['xs', 's', 'm', 'l', 'xl', 'xxl'];
      let total = 0;
      tallas.forEach(talla => {
        const valor = parseInt(document.getElementById(`talla-${talla}`)?.value) || 0;
        total += valor;
      });
      document.getElementById('total-unidades').textContent = total;
      return total;
    }

    function sincronizarEstadoPresupuesto() {
      // Guardar en el estado los valores actuales
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

    // ==================== ENVIAR SOLICITUD POR EMAIL ====================

    async function enviarSolicitudEmail() {
      sincronizarEstadoPresupuesto();

      const emailCliente = state.presupuesto.clienteEmail;
      if (!emailCliente) {
        showToast('Introduce tu email en "Datos del cliente"', false);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailCliente)) {
        showToast('Email del cliente no válido', false);
        return;
      }

      const totalUnidades = actualizarTotalUnidades();
      if (totalUnidades === 0) {
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

        showToast('Enviando...', true);

        const response = await fetch('enviar_email.php', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (result.success) {
          showToast('✅ Solicitud enviada correctamente', true);
        } else {
          showToast('❌ Error: ' + (result.error || 'No se pudo enviar'), false);
        }

      } catch (error) {
        console.error('Error:', error);
        showToast('❌ Error de conexión', false);
      }
    }

    // Función auxiliar que genera el PDF y devuelve el dataURL sin descargar
    async function generarSolicitudPDFDataURL() {
      console.log("📄 Iniciando generación de PDF...");

      try {
        sincronizarEstadoPresupuesto();

        // Obtener datos necesarios
        const colorNombre = obtenerNombreColor(state.colorActual.r, state.colorActual.g, state.colorActual.b);
        const vistaActualObj = vistas.find(v => v.id === state.vistaActual);
        const nombreVista = vistaActualObj ? vistaActualObj.nombre : state.vistaActual;

        const tiposEstampacion = {
          'serigrafia_1': 'Serigrafía 1 color',
          'serigrafia_2': 'Serigrafía 2 colores',
          'serigrafia_3': 'Serigrafía 3 colores',
          'serigrafia_4': 'Serigrafía 4 colores',
          'serigrafia_5': 'Serigrafía 5 colores',
          'serigrafia_cmyk': 'Serigrafía en cuatricromía (CMYK)',
          'dtf': 'DTF (Direct to Film)',
          'sublimacion': 'Sublimación',
          'bordado': 'Bordado'
        };
        const tipoEstampacionTexto = tiposEstampacion[state.presupuesto.tipoEstampacion] || state.presupuesto.tipoEstampacion;

        const hoy = new Date();
        const fechaStr = hoy.getFullYear().toString() +
          (hoy.getMonth() + 1).toString().padStart(2, '0') +
          hoy.getDate().toString().padStart(2, '0');
        const ref = `PRE-${fechaStr}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

        // Generar imagen del diseño
        console.log("📸 Generando captura del diseño...");
        const frames = document.querySelectorAll('.layer-frame');
        frames.forEach(f => f.style.opacity = '0');
        const container = document.getElementById('canvas-container');
        const canvas = await html2canvas(container, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
        frames.forEach(f => f.style.opacity = '1');
        const imagenDataURL = canvas.toDataURL('image/png');
        console.log("✅ Imagen generada");

        // Crear PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        // Contenido del PDF (simplificado pero funcional)
        pdf.setFontSize(18);
        pdf.setTextColor(200, 82, 26);
        pdf.text('SOLICITUD DE PRESUPUESTO', 20, 25);

        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Referencia: ${ref}`, 20, 35);
        pdf.text(`Fecha: ${hoy.toLocaleDateString('es-ES')}`, 20, 42);

        pdf.setDrawColor(200, 200, 200);
        pdf.line(20, 48, 190, 48);

        // Imagen
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        pdf.text('DISEÑO PRESENTADO', 20, 60);
        pdf.addImage(imagenDataURL, 'PNG', 20, 65, 70, 70);

        // Datos del estampado
        pdf.text('DATOS DEL ESTAMPADO', 110, 60);
        pdf.setFontSize(9);
        pdf.text(`Prenda: ${nombreVista}`, 110, 70);
        pdf.text(`Color: ${colorNombre}`, 110, 78);
        pdf.text(`Estampación: ${tipoEstampacionTexto}`, 110, 86);

        // Tabla de tallas
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        pdf.text('CANTIDADES POR TALLA', 20, 155);

        const tallas = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        const cantidades = [
          state.presupuesto.tallas.XS,
          state.presupuesto.tallas.S,
          state.presupuesto.tallas.M,
          state.presupuesto.tallas.L,
          state.presupuesto.tallas.XL,
          state.presupuesto.tallas.XXL
        ];
        const totalUnidades = cantidades.reduce((a, b) => a + b, 0);

        let x = 20;
        let y = 162;
        for (let i = 0; i < tallas.length; i++) {
          pdf.setFillColor(240, 240, 240);
          pdf.rect(x + (i * 25), y, 25, 8, 'F');
          pdf.setDrawColor(0, 0, 0);
          pdf.rect(x + (i * 25), y, 25, 8);
          pdf.text(tallas[i], x + (i * 25) + 8, y + 6);
        }

        y = 170;
        for (let i = 0; i < cantidades.length; i++) {
          pdf.rect(x + (i * 25), y, 25, 8);
          pdf.text(cantidades[i].toString(), x + (i * 25) + 10, y + 6);
        }

        pdf.text(`Total unidades: ${totalUnidades}`, 20, 188);

        // Datos del cliente
        y = 210;
        pdf.text('DATOS DEL CLIENTE', 20, y);
        pdf.setFontSize(9);
        pdf.text(`Nombre: ${state.presupuesto.clienteNombre || '[No especificado]'}`, 20, y + 10);
        pdf.text(`Email: ${state.presupuesto.clienteEmail || '[No especificado]'}`, 20, y + 18);
        pdf.text(`Teléfono: ${state.presupuesto.clienteTelefono || '[No especificado]'}`, 20, y + 26);

        if (state.presupuesto.observaciones) {
          pdf.text('Observaciones:', 20, y + 40);
          const lines = pdf.splitTextToSize(state.presupuesto.observaciones, 170);
          pdf.text(lines, 20, y + 48);
        }

        // Pie
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text('sergiformador.es - Solicitud de presupuesto', 20, 280);

        // Obtener dataURL
        const dataURL = pdf.output('datauristring');
        console.log("✅ PDF generado, longitud:", dataURL.length);

        return dataURL;

      } catch (error) {
        console.error("❌ Error en generarSolicitudPDFDataURL:", error);
        throw error;
      }
    }

    // ==================== INICIALIZACIÓN ====================
    renderVistas();
    renderPaleta();
    cargarVista('images/delante.png');