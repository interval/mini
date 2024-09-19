import { createServer, IncomingMessage, ServerResponse } from "http";
import { AnyZodObject, z } from "zod";
import { readFile } from "fs/promises";
import { createProxyMiddleware } from "http-proxy-middleware";
import { join, extname } from "path";
import { INPUT_SCHEMAS } from "./ioSchema";
import { AsyncLocalStorage } from "async_hooks";

const mimeTypes: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

const serveFile = async (
  publicFolder: string,
  filePath: string = "/index.html"
) => {
  try {
    const completePath = join(publicFolder, filePath);
    const data = await readFile(completePath);
    const ext = extname(completePath);
    const contentType = mimeTypes[ext] || "application/octet-stream";
    return { data, contentType, status: 200 };
  } catch {
    // If the file is not found, serve index.html for SPA routing
    const data = await readFile(`${publicFolder}/index.html`);
    return { data, contentType: "text/html", status: 200 };
  }
};

function createProxy(url: string | undefined) {
  if (!url) {
    return null;
  }
  const viteProxy = createProxyMiddleware({
    target: url,
    changeOrigin: true,
    ws: true, // Proxy WebSocket connections as well
  });
  return viteProxy;
}

type InputSchema = typeof INPUT_SCHEMAS;

type IORequest<T extends keyof InputSchema> = {
  methodName: T;
  props: z.infer<InputSchema[T]["props"]>;
};

const globalStore = new AsyncLocalStorage<{
  makeIORequest: <T extends keyof InputSchema>(
    methodName: T,
    props: z.infer<InputSchema[T]["props"]>
  ) => Promise<z.infer<InputSchema[T]["returns"]>>;
}>();

export async function io<T extends keyof InputSchema>(
  methodName: T,
  props: z.infer<InputSchema[T]["props"]>
): Promise<z.infer<InputSchema[T]["returns"]>> {
  const store = globalStore.getStore();

  if (!store) {
    throw new Error(`Cannot call io outside of an action`);
  }

  const resp = await store.makeIORequest(methodName, props);

  return resp;
}

type Action = {
  handler: () => Promise<any>;
};

class Failure<T> {
  constructor(public message: T) {}
}

function ioRequestHandler<T extends keyof InputSchema>(
  methodName: T,
  props: z.infer<InputSchema[T]["props"]>
) {
  let resolve: (value: z.infer<InputSchema[T]["returns"]>) => void;
  let promise = new Promise<z.infer<InputSchema[T]["returns"]>>((r, _) => {
    resolve = r;
  });

  const schema = INPUT_SCHEMAS[methodName];
  return {
    submitResponse: (body: any) => {
      const parsedBody = schema.returns.safeParse(body);
      if (!parsedBody.success) {
        return new Failure(parsedBody.error);
      }
      resolve(parsedBody.data);
    },
    promise,
    request: { methodName, props },
  };
}

type IORequestHandler = ReturnType<typeof ioRequestHandler>;

class Transaction {
  private state: "running" | "success" | "error" = "running";

  pendingIORequest: IORequestHandler | null = null;

  getState() {
    return {
      state: this.state,
      pendingIORequest: this.pendingIORequest?.request ?? null,
    };
  }

  respondToIORequest(body: any) {
    if (!this.pendingIORequest) {
      return new Failure(`No pending IO request`);
    }
    const result = this.pendingIORequest.submitResponse(body);
    return result;
  }

  constructor(public id: number, fn: () => Promise<void>) {
    globalStore.run(
      {
        makeIORequest: async (methodName, props) => {
          console.log("createIORequest", methodName, props);
          this.pendingIORequest = ioRequestHandler(methodName, props);
          const value = await this.pendingIORequest.promise;
          this.pendingIORequest = null;
          return value;
        },
      },
      () =>
        fn()
          .then(() => {
            this.state = "success";
          })
          .catch(() => {
            this.state = "error";
          })
    );
  }
}

class TransactionManager {
  #nextId = 0;

  #transactions: Record<number, Transaction> = {};

  getTransactionState(id: number) {
    const transaction = this.#transactions[id];
    if (!transaction) {
      return new Failure(`Transaction ${id} not found`);
    }
    return transaction.getState();
  }

  respondToIORequest(transactionId: number, body: any) {
    const transaction = this.#transactions[transactionId];
    if (!transaction) {
      return new Failure(`Transaction ${transactionId} not found`);
    }
    return transaction.respondToIORequest(body);
  }

  invoke(slug: string) {
    const action = this.actions[slug];
    if (!action) {
      return new Failure(`Action ${slug} not found`);
    }

    const id = this.#nextId++;

    this.#transactions[id] = new Transaction(id, action.handler);

    return { id };
  }

  constructor(public actions: Record<string, Action>) {}
}

type RpcDef = {
  params: AnyZodObject;
};

const rpcSchema = {
  invoke: {
    params: z.object({
      slug: z.string(),
    }),
  },
  get_transaction_state: {
    params: z.object({
      transactionId: z.number(),
    }),
  },
  respond_to_io_request: {
    params: z.object({
      transactionId: z.number(),
      body: z.any(),
    }),
  },
} satisfies Record<string, RpcDef>;

type RpcSchema = typeof rpcSchema;

type RpcHandlers = {
  [K in keyof RpcSchema]: (
    params: z.infer<RpcSchema[K]["params"]>
  ) => Promise<any>;
};

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const parsedBody = JSON.parse(body);
        resolve(parsedBody);
      } catch (error) {
        reject(error);
      }
    });
  });
}

export function createIntervalApp(options: {
  port: number;
  publicFrontendProxyUrl?: string;
  actions: Record<string, Action>;
}) {
  const publicFolder = join(__dirname, "static"); // Folder where SPA files are located

  console.log(`Serving UI bundle from ${publicFolder}`);

  const uiProxy = createProxy(options.publicFrontendProxyUrl);

  const transactionManager = new TransactionManager(options.actions);

  const rpc: RpcHandlers = {
    invoke: async (params) => {
      const result = transactionManager.invoke(params.slug);

      if (result instanceof Failure) {
        return result;
      }

      return {
        id: result.id,
      };
    },
    get_transaction_state: async (params) => {
      const state = transactionManager.getTransactionState(
        params.transactionId
      );
      return state;
    },
    respond_to_io_request: async (params) => {
      return transactionManager.respondToIORequest(
        params.transactionId,
        params.body
      );
    },
  };

  async function handleRpc(req: IncomingMessage, res: ServerResponse) {
    const methodName = req.url?.split("/")[2]; // eg /api/invoke/
    if (!methodName) {
      throw new Error("Method name not found");
    }

    const handler = rpc[methodName];
    const schema = rpcSchema[methodName];
    if (!handler || !schema) {
      throw new Error(`Method ${methodName} not found`);
    }

    const body = await parseJsonBody(req);
    const parsedBody = schema.params.parse(body);

    const result = await handler(parsedBody);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
  }

  createServer(async (req, res) => {
    if (req.method === "POST" && req.url?.startsWith("/api")) {
      try {
        await handleRpc(req, res);
      } catch (e) {
        console.error(e);
        if (e instanceof Error) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end(e.message);
        } else {
          res.writeHead(500);
          res.end("Internal Server Error");
        }
      }
    }

    if (!uiProxy) {
      const { data, contentType, status } = await serveFile(
        publicFolder,
        req.url
      );
      res.writeHead(status, { "Content-Type": contentType });
      res.end(data);
    } else {
      uiProxy(req, res, (err) => {
        if (err) {
          console.error("Proxy error:", err);
          res.writeHead(500);
          res.end("Internal Server Error");
        }
      });
    }
  }).listen(options.port, () => {
    console.log(`Server running at http://localhost:${options.port}`);
  });
}
