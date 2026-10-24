import http from 'node:http';
let calls = 0;
const server = http.createServer(async (request, response) => {
  if (request.url === '/__calls') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ calls }));
    return;
  }
  if (request.url !== '/api/search' || request.method !== 'POST') {
    response.writeHead(404); response.end(); return;
  }
  calls++;
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const { kw } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (String(kw).includes('并发')) await new Promise((resolve) => setTimeout(resolve, 1500));
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ code: 0, data: { merged_by_type: {
    baidu: [{ url: 'https://pan.baidu.com/s/community-fixture', note: `${kw} 百度资源` }],
    quark: [{ url: 'https://pan.quark.cn/s/community-fixture', note: `${kw} 夸克资源` }],
    115: [{ url: 'https://115.com/s/blocked', note: '应被过滤' }],
  } } }));
});
server.listen(18888, '127.0.0.1', () => console.log('fixture ready'));
