<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

define('DB_HOST', 'localhost');
define('DB_NAME', 'somaj_ro');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset='.DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

function jsonResponse(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function sanitizeInt($val, int $default, int $min, int $max): int {
    $v = filter_var($val, FILTER_VALIDATE_INT);
    if ($v === false) return $default;
    return max($min, min($max, $v));
}


$action   = $_GET['action']   ?? 'stats';
$yrStart  = sanitizeInt($_GET['yr_start'] ?? 2019, 2019, 2019, 2025);
$yrEnd    = sanitizeInt($_GET['yr_end']   ?? 2025, 2025, 2019, 2025);
$criteriu = in_array($_GET['criteriu'] ?? '', ['rata','feminin','masculin', 'fara_studii', 'primar', 
            'gimnazial', 'liceal', 'postliceal', 'profesional_arte_meserii', 'universitar', 'urban',
            'rural', 'varsta_25m', 'varsta_25_29', 'varsta_30_39', 'varsta_40_49', 'varsta_50_55', 
            'varsta_55p'])
              ? $_GET['criteriu'] : 'rata';

try {
    $db = getDB();

    switch ($action) {
        case 'judete':
            $rows = $db->query(
                'SELECT cod, nume, regiune, lat, lon FROM judete ORDER BY nume'
            )->fetchAll();
            jsonResponse(['status'=>'ok','data'=>$rows]);

        case 'stats':
            $sql = '
                SELECT j.cod, j.nume, j.lat, j.lon,
                       ROUND(AVG(r.rata),           2) AS rata,
                       ROUND(AVG(m.total),          2) AS total,
                       ROUND(AVG(m.feminin),        2) AS feminin,
                       ROUND(AVG(m.urban),          2) AS urban,
                       ROUND(AVG(m.masculin),       2) AS masculin,
                       ROUND(AVG(m.rural),          2) AS rural,
                       ROUND(AVG(v.varsta_25m),     2) AS varsta_25m,
                       ROUND(AVG(v.varsta_25_29),   2) AS varsta_25_29,
                       ROUND(AVG(v.varsta_30_39),   2) AS varsta_30_39,
                       ROUND(AVG(v.varsta_40_49),   2) AS varsta_40_49,
                       ROUND(AVG(v.varsta_50_55),   2) AS varsta_50_55,
                       ROUND(AVG(v.varsta_55p),     2) AS varsta_55p,
                       ROUND(AVG(e.fara_studii),    2) AS fara_studii,
                       ROUND(AVG(e.primar),         2) AS primar,
                       ROUND(AVG(e.gimnazial),      2) AS gimnazial,
                       ROUND(AVG(e.liceal),         2) AS liceal,
                       ROUND(AVG(e.postliceal),     2) AS postliceal,
                       ROUND(AVG(e.profesional_arte_meserii), 2) AS profesional_arte_meserii,
                       ROUND(AVG(e.universitar),    2) AS universitar
                FROM judete j
                JOIN rata r ON r.judet_cod = j.cod
                JOIN medii_sex m ON m.judet_cod = j.cod AND m.an = r.an
                JOIN varsta v ON v.judet_cod = j.cod AND v.an = r.an
                JOIN educatie e ON e.judet_cod = j.cod AND e.an = r.an
                WHERE r.an BETWEEN :ys AND :ye 
                GROUP BY j.cod, j.nume, j.lat, j.lon
                ORDER BY rata DESC
            ';
            $stmt = $db->prepare($sql);
            $stmt->execute([':ys' => $yrStart, ':ye' => $yrEnd]);
            $rows = $stmt->fetchAll();
            jsonResponse(['status'=>'ok','yr_start'=>$yrStart,'yr_end'=>$yrEnd,'data'=>$rows]);

        case 'evolutie':
            $sql = '
                SELECT j.nume, r.an, r.rata, m.total, m.feminin, m.urban, m.masculin, m.rural, 
                v.varsta_25m, v.varsta_25_29, v.varsta_30_39, v.varsta_40_49, 
                v.varsta_50_55, v.varsta_55p, e.fara_studii, e.primar, e.gimnazial, 
                e.liceal, e.postliceal, e.profesional_arte_meserii, e.universitar
                FROM rata r
                JOIN judete j ON j.cod = r.judet_cod
                JOIN medii_sex m ON m.judet_cod = j.cod AND r.an = m.an
                JOIN varsta v ON v.judet_cod = j.cod AND r.an = v.an
                JOIN educatie e ON e.judet_cod = j.cod AND r.an = e.an
                WHERE r.an BETWEEN :ys AND :ye
                ORDER BY r.an
            ';
            $stmt = $db->prepare($sql);
            $stmt->execute([':ys'=>$yrStart, ':ye'=>$yrEnd]);
            jsonResponse(['status'=>'ok','data'=>$stmt->fetchAll()]);

        case 'ping':
            $db->query('SELECT 1');
            jsonResponse(['status'=>'ok','message'=>'Conexiune DB activă']);

        default:
            jsonResponse(['status'=>'error','message'=>'Acțiune necunoscută'], 400);
    }

} catch (PDOException $e) {
    jsonResponse(['status'=>'error','message'=>'Eroare bază de date: '.$e->getMessage()], 500);
} catch (Throwable $e) {
    jsonResponse(['status'=>'error','message'=>$e->getMessage()], 500);
}
