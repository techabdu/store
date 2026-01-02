<?php
use PHPUnit\Framework\TestCase;
use GuzzleHttp\Client;
use GuzzleHttp\Cookie\CookieJar;

class MarketplaceTest extends TestCase
{
    private $client;
    private $jar;
    private $csrfToken;
    private $db;
    private $tenantId;
    private $shopId;
    private $userId;
    private $inventoryId;

    protected function setUp(): void
    {
        $host = getenv('DB_HOST') ?: '127.0.0.1';
        $user = getenv('DB_USER') ?: 'root';
        $pass = getenv('DB_PASS') ?: '';
        $name = getenv('DB_NAME') ?: 'store';

        $this->db = new mysqli($host, $user, $pass, $name);
        $this->seedData();

        $this->jar = new CookieJar();
        $this->client = new Client([
            'base_uri' => 'http://127.0.0.1:8000',
            'http_errors' => false,
            'cookies' => $this->jar
        ]);

        try {
            $response = $this->client->get('/api/auth/csrf_token.php');
            $data = json_decode($response->getBody(), true);
            $this->csrfToken = $data['csrf_token'] ?? '';
        } catch (\Exception $e) { $this->csrfToken = ''; }

        // Login
        $this->client->post('/api/auth/login.php', [
            'json' => ['username' => 'marketuser', 'password' => 'password123'],
            'headers' => ['X-CSRF-Token' => $this->csrfToken]
        ]);
    }

    protected function tearDown(): void
    {
        if ($this->db) {
            $this->db->query("SET FOREIGN_KEY_CHECKS=0");
            if ($this->userId) $this->db->query("DELETE FROM users WHERE id = $this->userId");
            if ($this->shopId) $this->db->query("DELETE FROM shops WHERE id = $this->shopId");
            if ($this->tenantId) $this->db->query("DELETE FROM tenants WHERE id = $this->tenantId");
            if ($this->inventoryId) $this->db->query("DELETE FROM inventory WHERE id = $this->inventoryId");
            $this->db->query("DELETE FROM marketplace_listings WHERE title = 'Test Listing'");
            $this->db->query("DELETE FROM marketplace_profiles WHERE user_id = $this->userId");
            $this->db->query("SET FOREIGN_KEY_CHECKS=1");
            $this->db->close();
        }
    }

    private function seedData()
    {
        $this->db->query("INSERT IGNORE INTO tenants (shop_name, shop_email, shop_phone, status, plan_type, email_verified)
            VALUES ('Market Tenant', 'market@test.com', '1234567890', 'active', 'enterprise', 1)");
        $this->tenantId = $this->db->insert_id ?: $this->db->query("SELECT id FROM tenants WHERE shop_email = 'market@test.com'")->fetch_object()->id;

        $this->db->query("INSERT IGNORE INTO shops (tenant_id, shop_name, status, is_main_branch)
            VALUES ($this->tenantId, 'Market Shop', 'active', 1)");
        $this->shopId = $this->db->insert_id ?: $this->db->query("SELECT id FROM shops WHERE tenant_id = $this->tenantId")->fetch_object()->id;

        $passwordHash = password_hash('password123', PASSWORD_DEFAULT);
        $this->db->query("INSERT IGNORE INTO users (tenant_id, shop_id, username, email, password_hash, role, status)
            VALUES ($this->tenantId, $this->shopId, 'marketuser', 'market@test.com', '$passwordHash', 'admin', 'active')");
        $this->userId = $this->db->insert_id ?: $this->db->query("SELECT id FROM users WHERE username = 'marketuser'")->fetch_object()->id;

        // Create Marketplace Profile (Required by API)
        $this->db->query("INSERT INTO marketplace_profiles (tenant_id, user_id, shop_id, display_name, is_active)
            VALUES ($this->tenantId, $this->userId, $this->shopId, 'Market User', 1)");

        // Seed Inventory Item for Listing
        $this->db->query("INSERT INTO inventory (tenant_id, shop_id, brand, model, imei, color, storage, condition_status, price, cost_price, status, created_by)
            VALUES ($this->tenantId, $this->shopId, 'Apple', 'iPhone 12', 'MK123456789', 'Blue', '64GB', 'New', 1000.00, 800.00, 'in_stock', $this->userId)");
        $this->inventoryId = $this->db->insert_id;
    }

    public function testCreateListing()
    {
        $response = $this->client->post('/api/marketplace/listings/create.php', [
            'json' => [
                'inventory_id' => $this->inventoryId,
                'title' => 'Test Listing',
                'description' => 'A test description',
                'price' => 1200.00,
                'listing_type' => 'fixed_price',
                'condition' => 'New'
            ],
            'headers' => ['X-CSRF-Token' => $this->csrfToken]
        ]);

        $this->assertTrue(in_array($response->getStatusCode(), [200, 201]), "Expected 200 or 201, got " . $response->getStatusCode() . " Body: " . $response->getBody());
        $data = json_decode($response->getBody(), true);
        $this->assertTrue($data['success']);
    }

    public function testListListings()
    {
        $response = $this->client->get('/api/marketplace/listings/list.php', [
            'headers' => ['X-CSRF-Token' => $this->csrfToken]
        ]);

        $this->assertEquals(200, $response->getStatusCode());
        $data = json_decode($response->getBody(), true);
        $this->assertTrue($data['success']);
        $this->assertIsArray($data['listings']);
    }
}
