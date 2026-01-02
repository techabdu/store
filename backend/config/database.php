<?php
// Load error handlers first to catch any errors during initialization
if (file_exists(__DIR__ . '/../helpers/error_handlers.php')) {
    require_once __DIR__ . '/../helpers/error_handlers.php';
}

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

        // Load Environment configuration class
        require_once __DIR__ . '/environment.php';

        // Use Environment class for centralized configuration
        $this->host = Environment::config('db_host', '127.0.0.1');
        $this->username = Environment::config('db_user', 'root');
        $this->password = Environment::config('db_pass', '');
        $this->db_name = Environment::config('db_name', 'store');
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
