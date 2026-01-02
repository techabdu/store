<?php
use PHPUnit\Framework\TestCase;
use GuzzleHttp\Client;
use GuzzleHttp\Cookie\CookieJar;

class InventoryTest extends TestCase
{
    private $client;
    private $jar;
    private $csrfToken;
    private $db;
    private $tenantId;
    private $shopId;

    protected function setUp(): void
    {
        // Database connection
        $host = getenv('DB_HOST') ?: '127.0.0.1';
        $user = getenv('DB_USER') ?: 'root';
        $pass = getenv('DB_PASS') ?: '';
        $name = getenv('DB_NAME') ?: 'store';

        $this->db = new mysqli($host, $user, $pass, $name);

        // Seed User
        $this->seedUser();

        // Setup HTTP Client
        $this->jar = new CookieJar();
        $this->client = new Client([
            'base_uri' => 'http://127.0.0.1:8000',
            'http_errors' => false,
            'cookies' => $this->jar
        ]);

        // Get CSRF Token
        try {
            $response = $this->client->get('/api/auth/csrf_token.php');
            $data = json_decode($response->getBody(), true);
            $this->csrfToken = $data['csrf_token'] ?? '';
        } catch (\Exception $e) { $this->csrfToken = ''; }

        // Login
        $this->client->post('/api/auth/login.php', [
            'json' => ['username' => 'invuser', 'password' => 'password123'],
            'headers' => ['X-CSRF-Token' => $this->csrfToken]
        ]);
    }

    protected function tearDown(): void
    {
        if ($this->db) {
            // Disable foreign key checks to force cleanup
            $this->db->query("SET FOREIGN_KEY_CHECKS=0");

            if ($this->shopId) {
                $this->db->query("DELETE FROM inventory WHERE shop_id = $this->shopId");
            }
            $this->db->query("DELETE FROM users WHERE username = 'invuser'");
            if ($this->shopId) {
                $this->db->query("DELETE FROM shops WHERE id = $this->shopId");
            }
            if ($this->tenantId) {
                $this->db->query("DELETE FROM tenants WHERE id = $this->tenantId");
            }

            $this->db->query("SET FOREIGN_KEY_CHECKS=1");
            $this->db->close();
        }
    }

    private function seedUser()
    {
        // Create Tenant
        $this->db->query("INSERT IGNORE INTO tenants (shop_name, shop_email, shop_phone, status, plan_type, email_verified)
            VALUES ('Inv Tenant', 'inv@test.com', '1234567890', 'active', 'enterprise', 1)");
        $this->tenantId = $this->db->insert_id ?: $this->db->query("SELECT id FROM tenants WHERE shop_email = 'inv@test.com'")->fetch_object()->id;

        // Create Shop
        $this->db->query("INSERT IGNORE INTO shops (tenant_id, shop_name, status, is_main_branch)
            VALUES ($this->tenantId, 'Inv Shop', 'active', 1)");
        $this->shopId = $this->db->insert_id ?: $this->db->query("SELECT id FROM shops WHERE tenant_id = $this->tenantId")->fetch_object()->id;

        // Create User
        $passwordHash = password_hash('password123', PASSWORD_DEFAULT);
        $this->db->query("INSERT IGNORE INTO users (tenant_id, shop_id, username, email, password_hash, role, status)
            VALUES ($this->tenantId, $this->shopId, 'invuser', 'inv@test.com', '$passwordHash', 'admin', 'active')");
    }

    public function testCreateInventory()
    {
        $response = $this->client->post('/api/inventory/create.php', [
            'json' => [
                'brand' => 'TestBrand',
                'model' => 'TestModel',
                'imei' => '123456789012345',
                'color' => 'Black',
                'storage' => '128GB',
                'condition_status' => 'New',
                'cost_price' => 500.00,
                'price' => 700.00,
                'vendor' => 'TestVendor'
            ],
            'headers' => ['X-CSRF-Token' => $this->csrfToken]
        ]);

        $this->assertTrue(in_array($response->getStatusCode(), [200, 201]));
        $data = json_decode($response->getBody(), true);
        $this->assertTrue($data['success']);
    }

    public function testReadInventory()
    {
        $response = $this->client->get('/api/inventory/read.php', [
            'headers' => ['X-CSRF-Token' => $this->csrfToken]
        ]);

        $this->assertEquals(200, $response->getStatusCode());
        $data = json_decode($response->getBody(), true);
        $this->assertTrue($data['success']);
        $this->assertIsArray($data['inventory']);
    }
}
