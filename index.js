import express from 'express';
import { createServer } from 'node:http';
import { createBareServer } from '@tomphttp/bare-server-node';
import { join } from 'node:path';

const __dirname = process.cwd();
const app = express();
const server = createServer();
const bare = createBareServer('/bare/');

// 静的ファイルの提供
app.use(express.static(join(__dirname, 'public')));

// ルーティング
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public/index.html'));
});

// 404エラーハンドリングの修正
// /service/ (プロキシ用パス) へのリクエストをサーバー側で拒否しないようにします
app.use((req, res, next) => {
    if (req.path.startsWith('/service/')) {
        return next();
    }
    res.status(404).send('Page Not Found');
});

// サーバーイベントの統合
server.on('request', (req, res) => {
    if (bare.shouldRoute(req)) {
        bare.routeRequest(req, res);
    } else {
        app(req, res);
    }
});

server.on('upgrade', (req, socket, head) => {
    if (bare.shouldRoute(req)) {
        bare.routeUpgrade(req, socket, head);
    } else {
        socket.end();
    }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server launched on port ${PORT}`);
});
