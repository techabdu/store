<?php
class Database {
    private $host;
    private $username;
    private $password;
    private $db_name;
    public $conn;

    public function __construct() {
        // Detect environment based on server hostname
        // Default to local if HTTP_HOST is not set (CLI mode)
        $isProduction = isset($_SERVER['HTTP_HOST']) && $_SERVER['HTTP_HOST'] !== 'localhost';

        if ($isProduction) {
            // Production credentials (Hostinger)
            $this->host = 'localhost';
            $this->username = 'u464722139_salsabeel';
            $this->password = 'Aa@store123';
            $this->db_name = 'u464722139_store';
        } else {
            // Local XAMPP credentials
            $this->host = '127.0.0.1';
            $this->username = 'root';
            $this->password = '';
            $this->db_name = 'store';
        }
    }

    public function connect() {
        $this->conn = null;

        try {
            $this->conn = new mysqli($this->host, $this->username, $this->password, $this->db_name);
            
            if ($this->conn->connect_error) {
                throw new Exception("Connection failed: " . $this->conn->connect_error);
            }
            
            $this->conn->set_charset("utf8mb4");
        } catch (Exception $e) {
            // In a class context, we might want to throw the exception or handle it
            // For now, we'll return the connection object (which might have connect_error set)
            // or let the global code handle the exit.
            // But for new Database()->connect() usage, we should probably return the connection 
            // even if failed, so the caller can check connect_error, OR throw exception.
            // The original procedural code exited.
            // Let's just log it here.
            error_log("Database Connection Error: " . $e->getMessage());
        }

        return $this->conn;
    }
}

// Backward compatibility for legacy procedural code
$database = new Database();
$conn = $database->connect();

// Check connection for legacy code
if ($conn->connect_error) {
    // Log error but don't expose details to user
    error_log("Connection failed: " . $conn->connect_error);
    
    // Return JSON error response
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}
?>
