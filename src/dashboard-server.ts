import http, { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { exchangeAuthorizationCode, getOAuthStartUrl } from "./jpm/oauth.js";
import {
  getDashboardEventEmitter,
  getDashboardHealth,
  getDashboardStatus,
  markDashboardUpdate,
  setWebsocketConnected
} from "./jpm/dashboard.js";

dotenv.config();

const PORT = Number(process.env.DASHBOARD_PORT || 8787);
const FRONTEND_REDIRECT_SUCCESS =
  process.env.FRONTEND_REDIRECT_SUCCESS || "file:///C:/Users/bizle/Desktop/jpmorgan_financial_apis/dashboard.html";
const ALLOWED_ORIGINS = (process.env.DASHBOARD_ALLOWED_ORIGINS || "null,http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((s) => s.trim());

type Session = {
  oauthState?: string;
  token?: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };
  createdAt: number;
};

const sessions = new Map<string, Session>();

function parseCookies(req: IncomingMessage): Record<string, string> {
  const cookieHeader = req.headers.cookie || "";
  const items = cookieHeader.split(";").map((v) => v.trim()).filter(Boolean);
  const out: Record<string, string> = {};
  for (const item of items) {
    const idx = item.indexOf("=");
    if (idx === -1) continue;
    out[item.slice(0, idx)] = decodeURIComponent(item.slice(idx + 1));
  }
  return out;
}

function ensureSession(req: IncomingMessage, res: ServerResponse): string {
  const cookies = parseCookies(req);
  let sid = cookies.sid;
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    res.setHeader("Set-Cookie", `sid=${encodeURIComponent(sid)}; Path=/; HttpOnly; SameSite=Lax`);
  }
  if (!sessions.has(sid)) sessions.set(sid, { createdAt: Date.now() });
  return sid;
}

function setCors(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin;
  if (!origin) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}

function json(res: ServerResponse, status: number, data: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function getSessionFromReq(req: IncomingMessage): Session | undefined {
  const sid = parseCookies(req).sid;
  if (!sid) return undefined;
  return sessions.get(sid);
}

function requireAuth(req: IncomingMessage, res: ServerResponse): Session | undefined {
  const session = getSessionFromReq(req);
  if (!session?.token?.access_token) {
    json(res, 401, { error: "unauthorized", message: "Login required via /api/auth/login" });
    return undefined;
  }
  return session;
}

const server = http.createServer(async (req, res) => {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const sid = ensureSession(req, res);
  const session = sessions.get(sid)!;
  const reqUrl = new URL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "GET" && reqUrl.pathname === "/api/health") {
    markDashboardUpdate();
    return json(res, 200, getDashboardHealth());
  }

  if (req.method === "GET" && reqUrl.pathname === "/api/dashboard/status") {
    markDashboardUpdate();
    return json(res, 200, getDashboardStatus());
  }

  if (req.method === "GET" && reqUrl.pathname === "/api/auth/login") {
    const start = getOAuthStartUrl();
    session.oauthState = start.state;
    sessions.set(sid, session);
    return json(res, 200, {
      oauthStartUrl: start.authUrl,
      state: start.state,
      missingEnv: start.missingEnv
    });
  }

  if (req.method === "GET" && reqUrl.pathname === "/api/auth/callback") {
    const code = reqUrl.searchParams.get("code");
    const state = reqUrl.searchParams.get("state");

    if (!code) return json(res, 400, { success: false, error: "missing_code" });
    if (!state) return json(res, 400, { success: false, error: "missing_state" });
    if (!session.oauthState || session.oauthState !== state) {
      return json(res, 400, { success: false, error: "invalid_state" });
    }

    try {
      const token = await exchangeAuthorizationCode(code);
      if ((token as any).missingEnv?.length) {
        return json(res, 500, { success: false, ...token });
      }
      session.token = token;
      session.oauthState = undefined;
      sessions.set(sid, session);
      markDashboardUpdate();

      return json(res, 200, {
        success: true,
        message: "OAuth callback processed successfully.",
        redirectTo: FRONTEND_REDIRECT_SUCCESS
      });
    } catch (err: any) {
      return json(res, 502, {
        success: false,
        error: "token_exchange_failed",
        message: err?.message || "Unknown token exchange error"
      });
    }
  }

  if (req.method === "GET" && reqUrl.pathname === "/api/accounts") {
    if (!requireAuth(req, res)) return;
    markDashboardUpdate();
    return json(res, 200, {
      accounts: [
        { id: "acc-001", name: "Operating Account", currency: "USD", balance: 0 },
        { id: "acc-002", name: "Treasury Account", currency: "USD", balance: 0 }
      ]
    });
  }

  if (req.method === "GET" && reqUrl.pathname === "/api/transactions") {
    if (!requireAuth(req, res)) return;
    markDashboardUpdate();
    return json(res, 200, { transactions: [] });
  }

  if (req.method === "GET" && reqUrl.pathname === "/api/payments") {
    if (!requireAuth(req, res)) return;
    markDashboardUpdate();
    return json(res, 200, { payments: [] });
  }

  json(res, 404, { error: "not_found" });
});

const wss = new WebSocketServer({ noServer: true });
const clients = new Set<WebSocket>();

function broadcastStatus(): void {
  const payload = JSON.stringify({ type: "status", data: getDashboardStatus() });
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
}

wss.on("connection", (ws) => {
  clients.add(ws);
  setWebsocketConnected(true);
  ws.send(JSON.stringify({ type: "status", data: getDashboardStatus() }));

  ws.on("close", () => {
    clients.delete(ws);
    if (clients.size === 0) setWebsocketConnected(false);
  });
});

getDashboardEventEmitter().on("status", () => {
  broadcastStatus();
});

setInterval(() => {
  markDashboardUpdate();
  broadcastStatus();
}, 5000);

server.on("upgrade", (req, socket, head) => {
  const reqUrl = new URL(req.url || "/", `http://${req.headers.host}`);
  if (reqUrl.pathname !== "/ws") {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

server.listen(PORT, () => {
  console.log(`Dashboard bridge server listening on http://localhost:${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
});
