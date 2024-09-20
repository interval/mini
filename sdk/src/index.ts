import { createServer, IncomingMessage, ServerResponse } from "http";
import { z } from "zod";
import { join } from "path";
import { InputSchemas } from "./ioSchema";
import { globalActionStore } from "./globalStores";
import { Action, TransactionManager } from "./TransactionManager";
import { Failure } from "./Failure";
import { makeUIServer } from "./serveUI";
import { rpcSchema, RpcSchema } from "./rpc";

export async function io<T extends keyof InputSchemas>(
  methodName: T,
  props: z.infer<InputSchemas[T]["props"]>
): Promise<z.infer<InputSchemas[T]["returns"]>> {
  const store = globalActionStore.getStore();

  if (!store) {
    throw new Error(`Cannot call I/O methods outside of an action`);
  }

  const resp = await store.makeIORequest(methodName, props);

  return resp;
}

type RpcHandlers = {
  [K in keyof RpcSchema]: (
    params: z.infer<RpcSchema[K]["params"]>
  ) => Promise<z.infer<RpcSchema[K]["returns"]> | Failure<any>>;
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
  const transactionManager = new TransactionManager(options.actions);

  const serveUI = makeUIServer({
    publicFolderPath: join(__dirname, "static"), // Folder where SPA files are located,
    publicFrontendProxyUrl: options.publicFrontendProxyUrl,
  });

  const rpc: RpcHandlers = {
    list_transactions: async () => {
      return [];
    },
    list_available_actions: async () => {
      return Object.keys(options.actions).map((slug) => ({ slug }));
    },
    invoke_transaction: async (params) => {
      const result = transactionManager.invoke(params.slug);

      if (result instanceof Failure) {
        return result;
      }

      return {
        transactionId: result.id,
        state: result.state,
      };
    },
    get_transaction_state: async (params) => {
      const transaction = transactionManager.getTransaction(
        params.transactionId
      );

      if (transaction instanceof Failure) {
        return transaction;
      }

      const state = transaction.stateManager.getState();

      return state;
    },
    respond_to_io_request: async (params) => {
      const transaction = transactionManager.getTransaction(
        params.transactionId
      );

      if (transaction instanceof Failure) {
        return transaction;
      }

      transaction.pendingIORequest?.submitResponse(params.body);

      return {};
    },
  };

  async function handleRpc(req: IncomingMessage, res: ServerResponse) {
    try {
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

  createServer(async (req, res) => {
    if (req.method === "GET" && req.url?.startsWith("/api/events")) {
      const id = Number(req.url.split("/")[3]);

      if (isNaN(id)) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Invalid transaction id");
        return;
      }

      // Set the headers to keep the connection alive and enable SSE
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      const transaction = transactionManager.getTransaction(id);

      if (transaction instanceof Failure) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end(transaction.message);
        return;
      }

      function sendJson(data: any) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }

      const subscription = transaction.stateManager.subscribe((newState) => {
        sendJson(newState);
      });

      if (subscription instanceof Failure) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end(subscription.message);
        return;
      }

      // Clean up when the client closes the connection
      req.on("close", () => {
        subscription.unsubscribe();
        res.end();
      });
    } else if (req.method === "POST" && req.url?.startsWith("/api")) {
      await handleRpc(req, res);
    } else {
      await serveUI(req, res);
    }
  }).listen(options.port, () => {
    console.log(`Server running at http://localhost:${options.port}`);
  });
}
