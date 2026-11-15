// Expose the disposable Auth and PostgREST services on one loopback origin.
import { createServer, request } from "node:http";

createServer((incoming, outgoing) => {
  const auth = incoming.url.startsWith("/auth/v1/");
  const rest = incoming.url.startsWith("/rest/v1/");
  if (!auth && !rest) {
    outgoing.writeHead(404).end();
    return;
  }
  const upstream = request({
    host: "127.0.0.1", port: auth ? 56322 : 56323,
    method: incoming.method, headers: incoming.headers, path: incoming.url.slice(8),
  }, (response) => {
    outgoing.writeHead(response.statusCode, response.headers);
    response.pipe(outgoing);
  });
  upstream.on("error", () => outgoing.writeHead(503).end());
  incoming.pipe(upstream);
}).listen(56321, "127.0.0.1");
