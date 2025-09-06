<?php
// runner.php (v10 - The Corrected and Final Engine)

ini_set('memory_limit', '-1');
ini_set('display_errors', 1);
error_reporting(E_ALL);

// [The format_variable function is unchanged and should be here]
function format_variable(/*... same as before ...*/) {
    static $seen_objects = []; $current_depth = func_num_args() > 1 ? func_get_arg(1) : 0; $max_depth = func_num_args() > 2 ? func_get_arg(2) : 8; $variable = func_get_arg(0); if ($current_depth === 0) $seen_objects = []; if ($current_depth > $max_depth) return ['type' => 'string', 'value' => '*MAX DEPTH REACHED*']; if (is_null($variable)) return ['type' => 'null', 'value' => 'null']; if (is_bool($variable)) return ['type' => 'boolean', 'value' => $variable]; if (is_int($variable) || is_float($variable)) return ['type' => 'number', 'value' => $variable]; if (is_string($variable)) return ['type' => 'string', 'value' => $variable, 'length' => strlen($variable)]; if (is_array($variable)) { $output = ['type' => 'array', 'count' => count($variable), 'values' => []]; foreach ($variable as $key => $value) { $output['values'][] = ['key' => format_variable($key, $current_depth + 1), 'value' => format_variable($value, $current_depth + 1)]; } return $output; } if (is_object($variable)) { $object_hash = spl_object_hash($variable); if (isset($seen_objects[$object_hash])) return ['type' => 'string', 'value' => '*RECURSION*']; $seen_objects[$object_hash] = true; $reflection = new ReflectionObject($variable); $output = ['type' => 'object', 'class' => $reflection->getName(), 'properties' => []]; foreach ($reflection->getProperties() as $property) { $property->setAccessible(true); $visibility = $property->isPublic() ? 'public' : ($property->isProtected() ? 'protected' : 'private'); try { $propValue = $property->getValue($variable); } catch (Error $e) { $propValue = '*UNINITIALIZED*'; } $output['properties'][] = ['name' => $property->getName(), 'visibility' => $visibility, 'value' => format_variable($propValue, $current_depth + 1)]; } return $output; } return ['type' => 'unknown'];
}


if ($argc < 3) { exit(json_encode(['error' => '...'])); }
$projectPath = $argv[1];
$userCode = $argv[2];

$response = ['output' => null, 'error' => null];

try {
    if (!is_dir($projectPath)) throw new Exception("Project path not found: {$projectPath}");
    $autoloader = $projectPath . '/vendor/autoload.php';
    if (!file_exists($autoloader)) throw new Exception("Composer autoloader not found.");

    chdir($projectPath);
    require_once $autoloader;
    $bootstrapFile = $projectPath . '/bootstrap/app.php';
    if (!file_exists($bootstrapFile)) throw new Exception("Laravel bootstrap file not found.");

    if (!function_exists('td')) {
        function td(...$vars) {
            foreach ($vars as $var) {
                echo "TINKER_DUMP_START" . json_encode(format_variable($var)) . "TINKER_DUMP_END\n";
            }
        }
    }

    ob_start();

    $app = require_once $bootstrapFile;
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();

    eval($userCode);

    $response['output'] = ob_get_clean();

} catch (Throwable $e) {
    // Catch parse errors from eval() as well as runtime errors
    $response['error'] = "PHP Error: {$e->getMessage()} on line {$e->getLine()}";
    if (ob_get_level() > 0) {
        $response['output'] = ob_get_clean(); // Get any output that occurred before the error
    }
}

header('Content-Type: application-json');
echo json_encode($response, JSON_PRETTY_PRINT | JSON_INVALID_UTF8_SUBSTITUTE);