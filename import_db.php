<?php
set_time_limit(0);

define('DB_HOST', 'localhost');
define('DB_NAME', 'somaj_ro');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

$dsn = 'mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset='.DB_CHARSET;
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
    
];

try {
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
} catch (\PDOException $e) {
    die("Eroare de conexiune la DB: " . $e->getMessage());
}

$caleRadacina = __DIR__ . '/baza_date';

$directoryIterator = new RecursiveDirectoryIterator($caleRadacina, RecursiveDirectoryIterator::SKIP_DOTS);
$iterator = new RecursiveIteratorIterator($directoryIterator);

foreach ($iterator as $fisier) {
    if ($fisier->isFile() && $fisier->getExtension() === 'csv') {
        
        $caleCompleta = $fisier->getPathname();
        $numeFisier = $fisier->getBasename('.csv');
        
        $anul = basename(dirname($caleCompleta)); 

        proceseazaCsv($caleCompleta, $numeFisier, $anul, $pdo);
    }
}

function proceseazaCsv($caleFisier, $tipDate, $an, $pdo) {

    $coduriJudete = [
        'ALBA' => 'AB', 'ARAD' => 'AR', 'ARGES' => 'AG', 'BACAU' => 'BC', 'BIHOR' => 'BH',
        'BISTRITA NASAUD' => 'BN', 'BISTRITA' => 'BN', 'BISTRITA-NASAUD' => 'BN', 'BOTOSANI' => 'BT', 'BRASOV' => 'BV',
        'BRAILA' => 'BR', 'BUCURESTI' => 'B', 'BUZAU' => 'BZ', 'CARAS SEVERIN' => 'CS',
        'CARAS-SEVERIN' => 'CS', 'CARAS' => 'CS', 'CARA?-SEVERIN' => 'CS', 'CALARASI' => 'CL', 'CLUJ' => 'CJ', 'CONSTANTA' => 'CT',
        'COVASNA' => 'CV', 'DAMBOVITA' => 'DB', 'DOLJ' => 'DJ', 'GALATI' => 'GL', 'GIURGIU' => 'GR',
        'GORJ' => 'GJ', 'HARGHITA' => 'HR', 'HUNEDOARA' => 'HD', 'IALOMITA' => 'IL', 'IASI' => 'IS',
        'ILFOV' => 'IF', 'MARAMURES' => 'MM', 'MEHEDINTI' => 'MH','MUN. BUCURESTI' => 'B', 'MUNICIPIUL BUCURESTI' => 'B', 'MUN. BUC.' => 'B', 'MURES' => 'MS', 'NEAMT' => 'NT',
        'OLT' => 'OT', 'PRAHOVA' => 'PH', 'SATU-MARE' => 'SM', 'SATU MARE' => 'SM', 'SATU M.' => 'SM', 'SALAJ' => 'SJ', 'SIBIU' => 'SB',
        'SUCEAVA' => 'SV', 'TELEORMAN' => 'TR', 'TIMIS' => 'TM', 'TULCEA' => 'TL', 'VASLUI' => 'VS',
        'VALCEA' => 'VL', 'VRANCEA' => 'VN'
    ];

    if (($maner = fopen($caleFisier, "r")) !== false) {
        
        $antet = fgetcsv($maner, 1000, ",");

        switch ($tipDate) {
            case 'medii':
                $sql = "INSERT INTO medii_sex (an, judet_cod, total, masculin, feminin, urban, rural) VALUES (?, ?, ?, ?,?, ?, ?)";
                break;
            case 'nivel-educatie':
                $sql = "INSERT INTO educatie (an, judet_cod, fara_studii, primar, gimnazial, liceal, postliceal, profesional_arte_meserii, universitar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                break;
            case 'rata':
                $sql = "INSERT INTO rata (an, judet_cod, rata) VALUES (?, ?, ?)";
                break;
            case 'varste':
                $sql = "INSERT INTO varsta (an, judet_cod, varsta_25m, varsta_25_29, varsta_30_39, varsta_40_49, varsta_50_55, varsta_55p) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
                break;
            default:
                echo "Tip de fișier necunoscut: $tipDate <br>";
                fclose($maner);
                return;
        }

        $stmt = $pdo->prepare($sql);

        try{
            $pdo->beginTransaction();

            $separator = ($an == '2025') ? ";" : ",";
            while (($rand = fgetcsv($maner, 1000, $separator)) !== false) {

                if (empty($rand) || !$rand[0]) continue;
                $numeJudetScurt = preg_replace('/[\x00-\x1F\x80-\xFF]/', '', $rand[0]);

                $numeJudetCurat = strtoupper(trim($numeJudetScurt));

                // echo ''.$rand[0].' '. $numeJudetScurt ."<br>";

                if (array_key_exists($numeJudetCurat, $coduriJudete)) {
                    $codJudet = $coduriJudete[$numeJudetCurat];

                    switch ($tipDate) {
                        case 'medii':
                            $dateInsert = [$an, $codJudet, $rand[1], $rand[3], $rand[2], $rand[4], $rand[7]];
                            break;
                        case 'nivel-educatie':
                            $dateInsert = [$an, $codJudet, $rand[2], $rand[3], $rand[4], $rand[5], $rand[6], $rand[7], $rand[8]];
                            break;
                        case 'rata':
                            if ($an == '2025') {
                                $rata  = str_replace(',', '.', $rand[6]);
                                $dateInsert = [$an, $codJudet, $rata];
                                break;
                            }
                            $dateInsert = [$an, $codJudet, $rand[6]];
                            break;
                        case 'varste':
                            $dateInsert = [$an, $codJudet, $rand[2], $rand[3], $rand[4], $rand[5], $rand[6], $rand[7]];
                            break;
                        default:
                            echo "Tip de fișier necunoscut: $tipDate <br>";
                            fclose($maner);
                            return;
                    }
                    
                    $stmt->execute($dateInsert);

                }else{
                    echo " Text nerecunoscut în $tipDate ($an): '$rand[0]' (Transformat în: '$numeJudetCurat')<br>";
                    continue;
                }
            }

            $pdo->commit();
            
            echo "Succes! Datele din $tipDate ($an) au fost importate.<br><hr>";
        } catch (\PDOException $e) {
            $pdo->rollBack();
            echo "Eroare la fișierul $tipDate ($an): " . $e->getMessage() . "<br><hr>";

            if (isset($dateInsert)) {
                echo "Datele care au eșuat: <pre>" . print_r($dateInsert, true) . "</pre><br>";
            }
            echo "<hr>";
        }
        fclose($maner);
    }
}
?>