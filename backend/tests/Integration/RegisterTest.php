<?php
use PHPUnit\Framework\TestCase;
use GuzzleHttp\Client;
use GuzzleHttp\Cookie\CookieJar;

class RegisterTest extends TestCase
{
    private $client;
    private $jar;
    private $csrfToken;
    private $db;

    protected function setUp(): void
    {
        $host = getenv('DB_HOST') ?: '127.0.0.1';
        $user = getenv('DB_USER') ?: 'root';
        $pass = getenv('DB_PASS') ?: '';
        $name = getenv('DB_NAME') ?: 'store';

        $this->db = new mysqli($host, $user, $pass, $name);

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
            $this->csrfToken = '';
        }
    }

    protected function tearDown(): void
    {
        if ($this->db) {
            $this->db->query("DELETE FROM users WHERE email = 'newuser@test.com'");
            $this->db->query("DELETE FROM shops WHERE shop_email = 'newuser@test.com'");
            $this->db->query("DELETE FROM tenants WHERE shop_email = 'newuser@test.com'");
            $this->db->close();
        }
    }

    public function testRegisterSuccess()
    {
        $response = $this->client->post('/api/auth/register.php', [
            'json' => [
                'shop_name' => 'New Shop',
                'owner_username' => 'newuser',
                'owner_email' => 'newuser@test.com',
                'shop_phone' => '0987654321',
                'shop_address' => '123 Test St',
                'password' => 'password123'
            ],
            'headers' => [
                'X-CSRF-Token' => $this->csrfToken
            ]
        ]);

        $this->assertEquals(201, $response->getStatusCode());
        $data = json_decode($response->getBody(), true);
        $this->assertTrue($data['success']);
        $this->assertStringContainsString('Shop registered successfully', $data['message']);
    }

    public function testRegisterDuplicateEmail()
    {
        // First registration
        $this->client->post('/api/auth/register.php', [
            'json' => [
                'shop_name' => 'New Shop',
                'owner_username' => 'newuser',
                'owner_email' => 'newuser@test.com',
                'shop_phone' => '0987654321',
                'shop_address' => '123 Test St',
                'password' => 'password123'
            ],
            'headers' => [
                'X-CSRF-Token' => $this->csrfToken
            ]
        ]);

        // Duplicate registration
        $response = $this->client->post('/api/auth/register.php', [
            'json' => [
                'shop_name' => 'Another Shop',
                'owner_username' => 'anotheruser',
                'owner_email' => 'newuser@test.com', // Same email
                'shop_phone' => '1122334455',
                'shop_address' => '456 Other St',
                'password' => 'password123'
            ],
            'headers' => [
                'X-CSRF-Token' => $this->csrfToken
            ]
        ]);

        $this->assertEquals(400, $response->getStatusCode());
        $data = json_decode($response->getBody(), true);
        $this->assertFalse($data['success']);
        $this->assertEquals('Email already registered', $data['error']);
    }
}
