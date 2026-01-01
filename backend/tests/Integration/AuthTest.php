<?php
use PHPUnit\Framework\TestCase;
use GuzzleHttp\Client;
use GuzzleHttp\Cookie\CookieJar;

class AuthTest extends TestCase
{
    private $client;
    private $jar;
    private $csrfToken;
    private $db;

    protected function setUp(): void
    {
        // Database connection for seeding
        $host = getenv('DB_HOST') ?: '127.0.0.1';
        $user = getenv('DB_USER') ?: 'root';
        $pass = getenv('DB_PASS') ?: '';
        $name = getenv('DB_NAME') ?: 'store';

        $this->db = new mysqli($host, $user, $pass, $name);
        if ($this->db->connect_error) {
            $this->markTestSkipped('Database connection failed: ' . $this->db->connect_error);
        }

        // Seed Test Data
        $this->seedTestData();

        // Setup HTTP Client
        $this->jar = new CookieJar();
        $this->client = new Client([
            'base_uri' => 'http://127.0.0.1:8000',
            'http_errors' => false,
            'cookies' => $this->jar
        ]);

        // Fetch CSRF token
        try {
            $response = $this->client->get('/api/auth/csrf_token.php');
            $data = json_decode($response->getBody(), true);
            $this->csrfToken = $data['csrf_token'] ?? '';
        } catch (\Exception $e) {
            // CSRF endpoint might not be available or needed depending on setup
            $this->csrfToken = '';
        }
    }

    protected function tearDown(): void
    {
        // Cleanup Test Data
        if ($this->db) {
            $this->db->query("DELETE FROM users WHERE username = 'testuser'");
            $this->db->query("DELETE FROM shops WHERE shop_name = 'Test Shop Main Branch'");
            $this->db->query("DELETE FROM tenants WHERE shop_email = 'test@example.com'");
            $this->db->close();
        }
    }

    private function seedTestData()
    {
        // Create Tenant
        $this->db->query("INSERT IGNORE INTO tenants (shop_name, shop_email, shop_phone, status, plan_type, email_verified)
            VALUES ('Test Tenant', 'test@example.com', '1234567890', 'active', 'enterprise', 1)");
        $tenantId = $this->db->insert_id ?: $this->db->query("SELECT id FROM tenants WHERE shop_email = 'test@example.com'")->fetch_object()->id;

        // Create Shop
        $this->db->query("INSERT IGNORE INTO shops (tenant_id, shop_name, status, is_main_branch)
            VALUES ($tenantId, 'Test Shop Main Branch', 'active', 1)");
        $shopId = $this->db->insert_id ?: $this->db->query("SELECT id FROM shops WHERE tenant_id = $tenantId")->fetch_object()->id;

        // Create User
        $passwordHash = password_hash('password123', PASSWORD_DEFAULT);
        $this->db->query("INSERT IGNORE INTO users (tenant_id, shop_id, username, email, password_hash, role, status)
            VALUES ($tenantId, $shopId, 'testuser', 'testuser@example.com', '$passwordHash', 'admin', 'active')");
    }

    public function testLoginSuccess()
    {
        $response = $this->client->post('/api/auth/login.php', [
            'json' => [
                'username' => 'testuser',
                'password' => 'password123'
            ],
            'headers' => [
                'X-CSRF-Token' => $this->csrfToken
            ]
        ]);

        $this->assertEquals(200, $response->getStatusCode());
        $data = json_decode($response->getBody(), true);
        $this->assertTrue($data['success']);
        $this->assertEquals('testuser', $data['user']['username']);
        $this->assertEquals('admin', $data['user']['role']);
    }

    public function testLoginInvalidCredentials()
    {
        $response = $this->client->post('/api/auth/login.php', [
            'json' => [
                'username' => 'testuser',
                'password' => 'wrongpassword'
            ],
            'headers' => [
                'X-CSRF-Token' => $this->csrfToken
            ]
        ]);

        $this->assertEquals(401, $response->getStatusCode());
        $data = json_decode($response->getBody(), true);
        $this->assertFalse($data['success']);
        $this->assertEquals('Invalid credentials', $data['error']);
    }

    public function testLoginNonExistentUser()
    {
        $response = $this->client->post('/api/auth/login.php', [
            'json' => [
                'username' => 'ghost',
                'password' => 'password'
            ],
            'headers' => [
                'X-CSRF-Token' => $this->csrfToken
            ]
        ]);

        $this->assertEquals(401, $response->getStatusCode());
    }

    public function testLoginMethodNotAllowed()
    {
        $response = $this->client->get('/api/auth/login.php');
        $this->assertEquals(405, $response->getStatusCode());
    }
}
