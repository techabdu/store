<?php
use PHPUnit\Framework\TestCase;

// We need to require the file to test it since it's a procedural helper
// But it might have side effects or require other files.
// Let's check backend/helpers/sanitize.php content first.
class HelperTest extends TestCase
{
    public function testSanitizeInput()
    {
        // Mocking or requiring the helper file
        require_once __DIR__ . '/../../helpers/sanitize.php';

        $input = " <script>alert('xss')</script> ";
        $expected = "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;";

        // sanitizeInput usually does trim and htmlspecialchars
        $this->assertEquals($expected, sanitizeInput($input));
    }
}
