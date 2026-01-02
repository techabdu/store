<?php
use PHPUnit\Framework\TestCase;
use GuzzleHttp\Client;
use GuzzleHttp\Cookie\CookieJar;

class SettingsTest extends TestCase
{
    private $client;
    private $jar;
    private $csrfToken;
    private $db;
    private $tenantId;
    private $shopId;
    private $userId;

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
            'json' => ['username' => 'settingsuser', 'password' => 'password123'],
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
            $this->db->query("SET FOREIGN_KEY_CHECKS=1");
            $this->db->close();
        }
    }

    private function seedData()
    {
        $this->db->query("INSERT IGNORE INTO tenants (shop_name, shop_email, shop_phone, status, plan_type, email_verified)
            VALUES ('Settings Tenant', 'settings@test.com', '1234567890', 'active', 'enterprise', 1)");
        $this->tenantId = $this->db->insert_id ?: $this->db->query("SELECT id FROM tenants WHERE shop_email = 'settings@test.com'")->fetch_object()->id;

        $this->db->query("INSERT IGNORE INTO shops (tenant_id, shop_name, status, is_main_branch)
            VALUES ($this->tenantId, 'Settings Shop', 'active', 1)");
        $this->shopId = $this->db->insert_id ?: $this->db->query("SELECT id FROM shops WHERE tenant_id = $this->tenantId")->fetch_object()->id;

        $passwordHash = password_hash('password123', PASSWORD_DEFAULT);
        $this->db->query("INSERT IGNORE INTO users (tenant_id, shop_id, username, email, password_hash, role, status)
            VALUES ($this->tenantId, $this->shopId, 'settingsuser', 'settings@test.com', '$passwordHash', 'admin', 'active')");
        $this->userId = $this->db->insert_id ?: $this->db->query("SELECT id FROM users WHERE username = 'settingsuser'")->fetch_object()->id;
    }

    public function testGetSettings()
    {
        $response = $this->client->get('/api/shop_settings.php', [
            'headers' => ['X-CSRF-Token' => $this->csrfToken]
        ]);

        $this->assertEquals(200, $response->getStatusCode());
        $data = json_decode($response->getBody(), true);
        $this->assertTrue($data['success']);
        $this->assertArrayHasKey('settings', $data);
    }

    public function testUpdateSettings()
    {
        // The API uses PUT for updates based on code analysis
        $response = $this->client->put('/api/shop_settings.php', [
            'json' => [
                'shop_name' => 'Updated Shop Name',
                'business_capital' => 500000
            ],
            'headers' => ['X-CSRF-Token' => $this->csrfToken]
        ]);

        $this->assertEquals(200, $response->getStatusCode());
        $data = json_decode($response->getBody(), true);
        $this->assertTrue($data['success']);
    }
}
