# PrintPreview Pro

Aplicacion web para crear bocetos de prendas personalizadas. Permite seleccionar la vista y el color de una camiseta, añadir logos o textos, ajustar sus propiedades y exportar el resultado como imagen o PDF.

## Funcionalidades

- Vistas de la prenda: delante, espalda, derecho e izquierdo.
- Cambio de color mediante tintado RGB de la imagen base.
- Cache en memoria de imagenes tintadas para mejorar la respuesta al repetir colores.
- Carga de logos desde el equipo del usuario.
- Creacion de textos personalizados.
- Ajustes de cada capa:
  - Tamano.
  - Posicion horizontal y vertical.
  - Opacidad.
  - Rotacion.
  - Modo de fusion.
  - Tinte del logo.
- Arrastre de capas con el raton.
- Exportacion del boceto a PNG y PDF.
- Generacion de solicitudes de presupuesto con:
  - Tipo de estampacion.
  - Cantidades por talla.
  - Observaciones.
  - Datos del cliente.
- Envio por email de imagenes y solicitudes PDF mediante PHP y PHPMailer.

## Tecnologias

- HTML5.
- CSS3.
- JavaScript ES Modules.
- PHP.
- PHPMailer.
- [html2canvas](https://html2canvas.hertzen.com/).
- [jsPDF](https://github.com/parallax/jsPDF).

Las librerias html2canvas y jsPDF se cargan desde CDN en `index.html`.

## Estructura del proyecto

```text
PrintPreviewDefinitivo/
├── index.html              Interfaz principal.
├── style.css               Estilos de la aplicacion.
├── enviar_email.php        Backend para enviar adjuntos por email.
├── images/                 Imagenes base de las prendas.
├── js/
│   ├── main.js             Punto de entrada y coordinacion general.
│   ├── state.js            Estado y configuracion compartida.
│   ├── garment.js          Vistas, paleta y tintado RGB de la prenda.
│   ├── layers.js           Logos, textos, capas y controles de ajuste.
│   ├── export.js            Exportacion PNG y PDF del boceto.
│   ├── budget.js            Presupuesto y generacion de solicitudes PDF.
│   └── email.js             Envio de imagenes y solicitudes por email.
└── PHPMailer/              Dependencia PHP para SMTP.
```

## Instalacion local con XAMPP

1. Copia el proyecto dentro de:

   ```text
   C:\xampp\htdocs\Utilitats\PrintPreviewDefinitivo
   ```

2. Inicia Apache desde el panel de XAMPP.
3. Abre la aplicacion desde:

   ```text
   http://localhost/Utilitats/PrintPreviewDefinitivo/
   ```

No es recomendable abrir `index.html` directamente con `file://`, porque los modulos JavaScript pueden quedar bloqueados por las politicas del navegador.

## Añadir nuevas prendas

Cada vista se define en `js/state.js` dentro de `vistas`:

```js
export const vistas = [
  { id: 'delante', nombre: 'Delante', archivo: 'images/delante.png' },
  { id: 'espalda', nombre: 'Espalda', archivo: 'images/espalda.png' }
];
```

Para incorporar otra prenda, crea sus imagenes base en `images/` y añade sus vistas a la configuracion. El sistema RGB reutiliza la misma imagen neutra, por lo que no es necesario crear una copia por cada color.

## Configuracion del email

El backend utiliza PHPMailer y SMTP. Antes de usar el envio por email, revisa `enviar_email.php` y configura:

- Servidor SMTP.
- Usuario SMTP.
- Contraseña o clave de aplicacion.
- Puerto y tipo de cifrado.
- Direccion del remitente.

### Seguridad y despliegue del correo

No publiques contraseñas SMTP ni PHPMailer dentro de `htdocs`. El endpoint busca estos elementos fuera de la carpeta pública:

```text
red/
├── PHPMailer/
│   └── src/
└── printpreview-mail.php
```

La dirección `ftp://gfiiligp@s50.profesionalhosting.com/red` es solo para subir archivos. PHP accederá a esa carpeta mediante la ruta local del servidor.

En `red/printpreview-mail.php` coloca:

```php
<?php
return [
    'host'       => 'smtp.gmail.com',
    'username'   => 'cuenta-que-envia@gmail.com',
    'password'   => 'NUEVA_CLAVE_DE_APLICACION',
    'port'       => 587,
    'encryption' => 'tls',
    'from'       => 'cuenta-que-envia@gmail.com',
    'from_name'  => 'PrintPreview Pro',
    'to'         => 'info@sergiformador.es'
];
```

Pasos:

1. Revoca en Google la contraseña de aplicación expuesta y crea una nueva.
2. Sube la carpeta `PHPMailer` completa dentro de `ftp://gfiiligp@s50.profesionalhosting.com/red`.
3. Sube `printpreview-mail.php` dentro de esa misma carpeta `red`.
4. Sube el `enviar_email.php` actualizado al proyecto público.
5. Comprueba el envío y elimina la carpeta pública `PHPMailer` cuando confirmes que funciona.

El endpoint soporta el proyecto dentro de `htdocs/Utilitats/` y también directamente dentro de `htdocs`. Si el hosting usa un SMTP propio, sustituye `host`, `port`, `encryption` y las credenciales por los datos del proveedor.


if ($es_solicitud_pdf) {
    $imagen_data    = $_POST['pdf_base64'];
    $nombre_archivo = 'solicitud-presupuesto.pdf';
} else {
    $imagen_data    = $_POST['imagen'] ?? '';
    $nombre_archivo = 'boceto-estampado.png';
}


$email_tuyo    = 'info@sergiformador.es';

if (empty($email_cliente) || !filter_var($email_cliente, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'error' => 'Email destinatario inválido']);
    exit;
}

if (empty($imagen_data)) {
    echo json_encode(['success' => false, 'error' => 'No se recibió el PDF']);
    exit;
}

// ── 2. DECODIFICAR PDF ────────────────────────────────────────────
// Extraemos solo el base64 puro después de la coma,
// independientemente del prefijo exacto que genere jsPDF
$coma_pos = strpos($imagen_data, ',');
if ($coma_pos !== false) {
    // Viene con prefijo data URI — lo eliminamos
    $base64_puro = substr($imagen_data, $coma_pos + 1);
} else {
    // Ya viene sin prefijo (base64 puro directo)
    $base64_puro = $imagen_data;
}

$base64_puro = str_replace(' ', '+', $base64_puro);
$pdf_binario = base64_decode($base64_puro);

if (!$pdf_binario || strlen($pdf_binario) < 100) {
    echo json_encode(['success' => false, 'error' => 'PDF inválido tras decodificar, longitud: ' . strlen($pdf_binario ?? '')]);
    exit;
}

// Guardar en temporal
$tmp_pdf = tempnam(sys_get_temp_dir(), 'solicitud_') . '.pdf';
file_put_contents($tmp_pdf, $pdf_binario);


// ── 3. FUNCIÓN DE ENVÍO ───────────────────────────────────────────
function enviarEmail($destinatario, $asunto, $cuerpo_html, $adjunto_path, $nombre_adjunto, $es_cliente = true) {
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'sergiformaciodigital@gmail.com';
        $mail->Password   = 'NUEVA_CLAVE_DE_APLICACION';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;
        $mail->CharSet    = 'UTF-8';

        $mail->setFrom('sergiformaciodigital@gmail.com', 'PrintPreview Pro');
        $mail->addAddress($destinatario);
        $mail->isHTML(true);
        $mail->Subject = $asunto;
        $mail->Body    = $cuerpo_html;
        $mail->AltBody = strip_tags($cuerpo_html);
       
        $mail->addAttachment($adjunto_path, $nombre_adjunto);

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log('PHPMailer error: ' . $mail->ErrorInfo);
        return false;
    }
}

// ── 4. PREPARAR CUERPOS DE EMAIL ──────────────────────────────────
$cuerpo_cliente = "
<html><body style='font-family:Arial,sans-serif;color:#333'>
  <h2 style='color:#c8521a'>🎨 Tu solicitud de presupuesto</h2>
  <p>" . nl2br(htmlspecialchars($mensaje_texto)) . "</p>
  <hr>
  <p style='color:#666;font-size:12px'>Adjunto encontrarás el PDF con el boceto y los detalles del pedido.<br>
  En breve recibirás un presupuesto personalizado.</p>
  <p style='color:#999;font-size:11px'>Enviado desde PrintPreview · sergiformador.es</p>
</body></html>";

$datos_extra = "";
if (!empty($_POST['mensaje'])) {
    $datos_extra = "<p>" . nl2br(htmlspecialchars($mensaje_texto)) . "</p><hr>";
}

$cuerpo_tuyo = "
<html><body style='font-family:Arial,sans-serif;color:#333'>
  <h2 style='color:#c8521a'>🆕 Nueva solicitud de presupuesto</h2>
  <p><strong>Fecha:</strong> " . date('d/m/Y H:i:s') . "</p>
  <p><strong>Cliente:</strong> " . htmlspecialchars($email_cliente) . "</p>
  <hr>
  $datos_extra
  <p style='color:#666;font-size:12px'>Adjunto el PDF con la solicitud completa.</p>
</body></html>";

// ── 5. ENVIAR ─────────────────────────────────────────────────────
$enviado_cliente   = enviarEmail($email_cliente, $asunto,                       $cuerpo_cliente, $tmp_pdf, $nombre_archivo, true);
$enviado_proveedor = enviarEmail($email_tuyo,    'NUEVA SOLICITUD — ' . $asunto, $cuerpo_tuyo,   $tmp_pdf, $nombre_archivo, false);

unlink($tmp_pdf);

// ── 6. RESPUESTA ──────────────────────────────────────────────────
if ($enviado_cliente && $enviado_proveedor) {
    echo json_encode(['success' => true, 'message' => 'Enviado al cliente y a ' . $email_tuyo]);
} elseif ($enviado_cliente) {
    echo json_encode(['success' => true, 'message' => 'Enviado al cliente (fallo copia proveedor)']);
} elseif ($enviado_proveedor) {
    echo json_encode(['success' => false, 'error' => 'Llegó al proveedor pero falló el envío al cliente']);
} else {
    echo json_encode(['success' => false, 'error' => 'Fallo en ambos envíos — revisa credenciales Gmail']);
}
?>
## Mantenimiento

El punto de entrada es `js/main.js`. Los demas modulos se cargan mediante `import`, por lo que `index.html` solo necesita:

```html
<script type="module" src="js/main.js"></script>
```

Despues de modificar JavaScript, puedes comprobar la sintaxis con Node.js:

```powershell
node --check js/state.js
node --check js/garment.js
node --check js/layers.js
node --check js/export.js
node --check js/budget.js
node --check js/email.js
node --check js/main.js
```

## Flujo de uso

1. Selecciona una vista de la prenda.
2. Elige un color de la paleta.
3. Añade un logo o un texto.
4. Selecciona la capa y ajusta sus propiedades.
5. Descarga el boceto como PNG o PDF.
6. Completa los datos del presupuesto si necesitas generar una solicitud.
7. Usa las opciones de envio cuando el backend de correo este configurado.
