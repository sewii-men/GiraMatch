const fetch = require('node-fetch');

(async () => {
  // Login to get token
  const loginRes = await fetch('http://localhost:4000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  console.log('Token obtained:', token ? '✅' : '❌');

  // Test the endpoint
  const res = await fetch('http://localhost:4000/matches/test_match_001/post-match-chat', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  console.log('Status:', res.status, res.statusText);

  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
})();
