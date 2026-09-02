// Gateway JSON-RPC sidecar client (inline; avoids pulling in @hermes/shared).
// Same transport the stock ChatSidebar uses for session.create
// (web/src/components/ChatSidebar.tsx:222).
import { buildWsAuthParam, HERMES_BASE_PATH } from "./hermesApi";

export interface CreateSessionBody {
  close_on_disconnect?: boolean;
  source?: string;
  profile?: string;
}

class JsonRpcGatewayClient {
  connectionState: "idle" | "connecting" | "open" | "closed" = "idle";
  private ws: WebSocket | null = null;
  private _seq = 0;
  private _pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  private _events = new Map<string, Array<(payload: unknown) => void>>();
  private _stateHandler?: (state: string) => void;

  async connect(): Promise<void> {
    if (this.connectionState === "open") return;
    this.connectionState = "connecting";
    const [name, value] = await buildWsAuthParam();
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${
      proto
    }//${location.host}${HERMES_BASE_PATH}/api/ws?${name}=${encodeURIComponent(
      value,
    )}`;
    this.ws = new WebSocket(url);
    this.ws.binaryType = "arraybuffer";
    this.ws.onopen = () => {
      this.connectionState = "open";
      this._stateHandler?.("open");
    };
    this.ws.onmessage = (e) => {
      let text: string;
      if (typeof e.data === "string") {
        text = e.data;
      } else {
        text = new TextDecoder().decode(new Uint8Array(e.data));
      }
      for (const line of text.split("\n").filter(Boolean)) {
        this._handleFrame(line.trim());
      }
    };
    this.ws.onclose = (e) => {
      this.connectionState = "closed";
      this._stateHandler?.("closed");
      for (const [, p] of this._pending) {
        p.reject(new Error(`WebSocket closed (code ${e.code})`));
      }
      this._pending.clear();
    };
    this.ws.onerror = () => {
      this.connectionState = "closed";
      this._stateHandler?.("closed");
    };
    await new Promise<void>((resolve, reject) => {
      const onOpen = () => {
        this.ws?.removeEventListener("open", onOpen);
        this.ws?.removeEventListener("error", onError);
        resolve();
      };
      const onError = () => {
        this.ws?.removeEventListener("open", onOpen);
        this.ws?.removeEventListener("error", onError);
        reject(new Error("WebSocket connection failed"));
      };
      this.ws!.addEventListener("open", onOpen);
      this.ws!.addEventListener("error", onError);
      setTimeout(() => {
        if (this.connectionState !== "open") {
          this.ws?.removeEventListener("open", onOpen);
          this.ws?.removeEventListener("error", onError);
          reject(new Error("WebSocket connection timed out"));
        }
      }, 15000);
    });
  }

  private _handleFrame(line: string) {
    let msg: unknown;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    if (!msg || typeof msg !== "object") return;
    const m = msg as Record<string, unknown>;
    if (m.jsonrpc !== "2.0") {
      const eventType = m.type;
      if (typeof eventType === "string" && eventType) {
        const handlers = this._events.get(eventType) ?? [];
        for (const h of handlers) h(m);
        if (eventType === "error" && typeof m.message === "string") {
          this._stateHandler?.("error");
        }
      }
      return;
    }
    const id = m.id;
    if (id === undefined || id === null) return;
    const pending = this._pending.get(Number(id));
    if (!pending) return;
    this._pending.delete(Number(id));
    if (m.error) {
      pending.reject(new Error(String(m.error)));
    } else {
      pending.resolve(m.result);
    }
  }

  request<T>(method: string, params?: unknown): Promise<T> {
    if (this.connectionState !== "open") {
      return Promise.reject(new Error("gateway not connected"));
    }
    return new Promise((resolve, reject) => {
      const id = ++this._seq;
      this._pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this._send({ jsonrpc: "2.0", id, method, params });
    });
  }

  private _send(msg: object) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("gateway not connected");
    }
    this.ws.send(JSON.stringify(msg) + "\n");
  }

  onState(handler: (state: string) => void): () => void {
    this._stateHandler = handler;
    return () => {};
  }

  onEvent(event: string, handler: (payload: unknown) => void): () => void {
    const list = this._events.get(event) ?? [];
    list.push(handler);
    this._events.set(event, list);
    return () => {
      const l = this._events.get(event);
      if (l) {
        const i = l.indexOf(handler);
        if (i >= 0) l.splice(i, 1);
      }
    };
  }

  close(): void {
    this.ws?.close();
  }
}

let _gwSingleton: JsonRpcGatewayClient | null = null;
let _gwConnectPromise: Promise<JsonRpcGatewayClient> | null = null;

export async function getGatewayClient(): Promise<JsonRpcGatewayClient> {
  if (_gwSingleton?.connectionState === "open") return _gwSingleton;
  if (!_gwConnectPromise) {
    _gwConnectPromise = connectGatewayClient();
  }
  const gw = await _gwConnectPromise;
  _gwSingleton = gw;
  return gw;
}

async function connectGatewayClient(): Promise<JsonRpcGatewayClient> {
  const gw = new JsonRpcGatewayClient();
  await gw.connect();
  return gw;
}

export async function createSession(
  body: CreateSessionBody = {},
): Promise<{ session_id: string }> {
  const gw = await getGatewayClient();
  return gw.request<{ session_id: string }>("session.create", {
    close_on_disconnect: true,
    source: body.source ?? "tool",
    ...(body.profile ? { profile: body.profile } : {}),
  });
}
