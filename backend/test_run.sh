#!/bin/bash
cd /data/.openclaw/workspace/projects/stock-photo-shop-v2/backend
node server.js &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
sleep 2
echo "--- Health Check ---"
curl -s http://localhost:3001/api/health || echo "FAILED"
echo ""
echo "--- Images (should be empty) ---"
curl -s http://localhost:3001/api/images || echo "FAILED"
echo ""
echo "--- Killing server ---"
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
echo "Done"
