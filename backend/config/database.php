<?php
class Database {
    private $host;
    private $username;
    private $password;
    private $db_name;
    public $conn;

    public function __construct() {
        // Load Composer autoloader if available
        if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
            require_once __DIR__ . '/../vendor/autoload.php';
        }

        // Load environment variables
        $this->loadEnv();

        // Use environment variables or default to empty/null
        $this->host = getenv('DB_HOST') ?: '127.0.0.1';
        $this->username = getenv('DB_USER') ?: 'root';
        $this->password = getenv('DB_PASS') ?: '';
        $this->db_name = getenv('DB_NAME') ?: 'store';
    }

    private function loadEnv() {
        // Only load .env if we are not in a production environment where env vars are already set
        // Or just try to load it and let existing env vars take precedence
        $envPath = __DIR__ . '/../.env';
        if (file_exists($envPath)) {
            $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) {
                    continue;
                }
                if (strpos($line, '=') !== false) {
                    list($name, $value) = explode('=', $line, 2);
                    $name = trim($name);
                    $value = trim($value);
                    
                    // Remove quotes if present
                    if (preg_match('/^"(.*)"$/', $value, $matches)) {
                        $value = $matches[1];
                    } elseif (preg_match("/^'(.*)'$/", $value, $matches)) {
                        $value = $matches[1];
                    }

                    // Set environment variable if not already set
                    if (getenv($name) === false) {
                        putenv(sprintf('%s=%s', $name, $value));
                        $_ENV[$name] = $value;
                        $_SERVER[$name] = $value;
                    }
                }
            }
        }
    }

    public function connect() {
        $this->conn = null;

        try {
            // Suppress warnings to handle connection errors gracefully
            $this->conn = @new mysqli($this->host, $this->username, $this->password, $this->db_name);
            
            if ($this->conn->connect_error) {
                error_log("Connection failed: " . $this->conn->connect_error);
                throw new Exception("Database connection failed");
            }
            
            $this->conn->set_charset("utf8mb4");
        } catch (Exception $e) {
            // Log the actual error
            error_log("Database Connection Error: " . $e->getMessage());
            
            // Return null or handle based on context. 
            // For API calls, we might want to exit with JSON error.
            // But since this class is used in various places, let's keep the behavior 
            // of returning null (or the object with error state) and let the caller handle it,
            // OR exit here if it's a critical failure for the request.
            // The legacy code below handles the exit.
        }

        return $this->conn;
    }
}

// Backward compatibility for legacy procedural code
$database = new Database();
$conn = $database->connect();

// Check connection for legacy code
if ($conn === null || $conn->connect_error) {
    // Log error but don't expose details to user
    // error_log is already called in connect()
    
    // Return JSON error response
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Internal Server Error']); // Generic message
    exit;
}
?>
