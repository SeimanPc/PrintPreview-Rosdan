<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json');

function archivoPrivado($nombre) {
    $rutas = [];
    $rutaConfiguracion = getenv('PRINTPREVIEW_CONFIG');

    if ($rutaConfiguracion && $nombre === 'printpreview-mail.php') {
        $rutas[] = $rutaConfiguracion;
    }

    // Cubre htdocs/Utilitats/PrintPreviewDefinitivo y htdocs/PrintPreviewDefinitivo.
    $rutas[] = dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . 'red' . DIRECTORY_SEPARATOR . $nombre;
    $rutas[] = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'red' . DIRECTORY_SEPARATOR . $nombre;

    foreach (array_unique($rutas) as $ruta) {
        if ((is_file($ruta) || is_dir($ruta)) && is_readable($ruta)) {
            return $ruta;
        }
    }

    return null;
}

// ── PHPMailer fuera de la carpeta pública ────────────────────────
$rutaPHPMailer = archivoPrivado('PHPMailer');
if (!$rutaPHPMailer) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'No se encontró PHPMailer en la carpeta privada red']);
    exit;
}

require $rutaPHPMailer . '/src/Exception.php';
require $rutaPHPMailer . '/src/PHPMailer.php';
require $rutaPHPMailer . '/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

function responderError($mensaje, $codigo = 400) {
    http_response_code($codigo);
    echo json_encode(['success' => false, 'error' => $mensaje]);
    exit;
}

function configuracionSMTP() {
    $ruta = archivoPrivado('printpreview-mail.php');
    if ($ruta) {
        $configuracion = require $ruta;
        if (!is_array($configuracion)) {
            throw new Exception('printpreview-mail.php debe devolver un array PHP');
        }
        return $configuracion;
    }

    return [
        'host'       => getenv('MAIL_HOST') ?: 'smtp.gmail.com',
        'username'   => getenv('MAIL_USERNAME') ?: '',
        'password'   => getenv('MAIL_PASSWORD') ?: '',
        'port'       => (int) (getenv('MAIL_PORT') ?: 587),
        'encryption' => strtolower(getenv('MAIL_ENCRYPTION') ?: 'tls'),
        'from'       => getenv('MAIL_FROM') ?: '',
        'from_name'  => getenv('MAIL_FROM_NAME') ?: 'PrintPreview Pro',
        'to'         => getenv('MAIL_TO') ?: 'info@sergiformador.es'
    ];
}

// ── 1. RECIBIR Y VALIDAR DATOS ────────────────────────────────────
$email_cliente = trim($_POST['email']   ?? '');
$asunto        = $_POST['asunto']       ?? 'Solicitud de presupuesto';
$mensaje_texto = $_POST['mensaje']      ?? '';


// Primero defino si es una solicitud con PDF o solo con imagen, para luego decidir qué campo usar
$es_solicitud_pdf = isset($_POST['pdf_base64']) && !empty($_POST['pdf_base64']);


if ($es_solicitud_pdf) {
    $imagen_data    = $_POST['pdf_base64'];
    $nombre_archivo = 'solicitud-presupuesto.pdf';
} else {
    $imagen_data    = $_POST['imagen'] ?? '';
    $nombre_archivo = 'boceto-estampado.png';
}


$configuracion = configuracionSMTP();
$email_tuyo    = $configuracion['to'] ?? 'info@sergiformador.es';

if (empty($email_cliente) || !filter_var($email_cliente, FILTER_VALIDATE_EMAIL)) {
    responderError('Email destinatario inválido');
}

if (empty($imagen_data)) {
    responderError('No se recibió el archivo del presupuesto');
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
$pdf_binario = base64_decode($base64_puro, true);

if (!$pdf_binario || strlen($pdf_binario) < 100) {
    responderError('Archivo inválido tras decodificar');
}

// Guardar en temporal
$tmp_pdf = tempnam(sys_get_temp_dir(), 'solicitud_') . '.pdf';
if ($tmp_pdf === false || file_put_contents($tmp_pdf, $pdf_binario) === false) {
    responderError('El servidor no pudo crear el archivo temporal', 500);
}


// ── 3. FUNCIÓN DE ENVÍO ───────────────────────────────────────────
function enviarEmail($destinatario, $asunto, $cuerpo_html, $adjunto_path, $nombre_adjunto, $es_cliente = true) {
    $mail = new PHPMailer(true);
    try {
        $smtp = configuracionSMTP();
        if (empty($smtp['username']) || empty($smtp['password']) || empty($smtp['from'])) {
            throw new Exception('Faltan MAIL_USERNAME, MAIL_PASSWORD o MAIL_FROM en la configuración del servidor');
        }

        $mail->isSMTP();
        $mail->Host       = $smtp['host'];
        $mail->SMTPAuth   = true;
        $mail->Username   = $smtp['username'];
        $mail->Password   = $smtp['password'];
        $mail->SMTPSecure = $smtp['encryption'] === 'ssl'
            ? PHPMailer::ENCRYPTION_SMTPS
            : PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = $smtp['port'];
        $mail->Timeout    = 15;
        $mail->Timelimit  = 30;
        $mail->CharSet    = 'UTF-8';

        $mail->setFrom($smtp['from'], $smtp['from_name']);
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

if (is_file($tmp_pdf)) {
    unlink($tmp_pdf);
}

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