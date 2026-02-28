import express from 'express';
import http from 'node:http';
import { createBareServer } from "@tomphttp/bare-server-node";
import cors from 'cors';
import path from 'node:path';

const server = http.createServer();
const app = express();
const rootDir = process.cwd();
const bareServer = createBareServer('/bare/');
const PORT = process.env.PORT || 8080;

// ミドルウェア設定
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静的ファイルの提供 (public フォルダ)
app.use(express.static(path.join(rootDir, "public")));

// ルートパスへのアクセス
app.get("/", (req, res) => {
    res.sendFile(path.join(rootDir, "public/index.html"));
});

// 検索エンジンAPI (キーワードを検索URLに変換)
app.get("/api/search", async (req, res) => {
    const q = String(req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "missing q" });

    // フォールバック用の検索エンジンリスト
    const engines = [
        "https://duckduckgo.com/?q=%s",
        "https://duckduckgo.com/html/?q=%s",
        "https://lite.duckduckgo.com/lite/?q=%s"
    ];

    const query = encodeURIComponent(q);

    for (const tpl of engines) {
        const url = tpl.replace("%s", query);

        try {
            // 各エンジンへの接続確認 (タイムアウト2秒)
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 2000);

            const r = await fetch(url, {
                method: "GET",
                signal: controller.signal,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
                }
            });

            clearTimeout(timer);

            if (r.ok) {
                return res.json({ url });
            }
        } catch (e) {
            // エラー時は次のエンジンを試行
            console.log(`Engine failed: ${url} - skipping...`);
        }
    }

    // すべて失敗した場合
    return res.status(502).json({ error: "no search engine available" });
});

// 404エラーハンドリング
// /service/ (プロキシ用仮想パス) へのリクエストをサーバー側で遮断しないように設定
app.use((req, res, next) => {
    if (req.path.startsWith('/service/')) {
        return next();
    }
    res.status(404).send('Page Not Found');
});

// サーバーイベントの統合 (Bare Server と Express)
server.on('request', (req, res) => {
    if (bareServer.shouldRoute(req)) {
        bareServer.routeRequest(req, res);
    } else {
        app(req, res);
    }
});

// WebSocket/Upgradeイベントの統合 (Bare Server)
server.on('upgrade', (req, socket, head) => {
    if (bareServer.shouldRoute(req)) {
        bareServer.routeUpgrade(req, socket, head);
    } else {
        socket.end();
    }
});

// サーバー起動
server.listen(PORT, () => {
    console.log(`Server Listening on port ${PORT}`);
    console.log(`Base directory: ${rootDir}`);
});

// 終了処理 (クリーンアップ)
function shutdown() {
    console.log("Shutting down...");
    server.close(() => {
        bareServer.close();
        process.exit(0);
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
