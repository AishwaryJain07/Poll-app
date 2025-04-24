const http = require('http');
const pool = require('./db'); // PostgreSQL pool connection
const fs = require('fs');
const path = require('path');
const PORT = 3000;

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // ✅ Set CORS headers to allow cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ✅ Handle preflight request (CORS)
  if (req.method === 'OPTIONS') {
    res.writeHead(204); // No Content
    res.end();
    return;
  }

  // ✅ Serve index.html file on root route '/'
  if (req.url === '/' && req.method === 'GET') {
    const filePath = path.join(__dirname, 'public', 'index.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        // Error reading file
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading index.html');
      } else {
        // Serve HTML file
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      }
    });
    return;
  }

  // ✅ GET /polls - Retrieve all polls from the database
  if (req.url === '/polls' && req.method === 'GET') {
    const result = await pool.query('SELECT * FROM poll');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result.rows));
  }

  // ✅ GET /polls/:id - Retrieve a specific poll by ID
  else if (req.url.startsWith('/polls/') && req.method === 'GET') {
    const id = req.url.split('/')[2]; // Extract poll ID from URL
    const result = await pool.query('SELECT * FROM poll WHERE id = $1', [id]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result.rows));
  }

  // ✅ DELETE /polls/:id - Delete a specific poll by ID
  else if (req.url.startsWith('/polls/') && req.method === 'DELETE') {
    const id = req.url.split('/')[2]; // Extract poll ID
    await pool.query('DELETE FROM poll WHERE id = $1', [id]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Poll deleted' }));
  }

  // ✅ POST /polls - Create a new poll
  else if (req.url === '/polls' && req.method === 'POST') {
    let body = '';
    
    // Collect data chunks
    req.on('data', chunk => {
      body += chunk;
    });

    // Handle end of data
    req.on('end', async () => {
      const { title, caption, options } = JSON.parse(body); // Parse incoming JSON
      const result = await pool.query(
        'INSERT INTO poll (title, caption, options) VALUES ($1, $2, $3) RETURNING *',
        [title, caption, JSON.stringify(options)] // Convert options array to JSON string
      );
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.rows[0]));
    });
  }

  // ❌ Fallback for unknown routes
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Route not found' }));
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
