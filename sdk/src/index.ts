import { createServer, IncomingMessage, ServerResponse } from "http";
import { AnyZodObject, z } from "zod";
import { join } from "path";
import { InputSchemas } from "./ioSchema";
import { globalActionStore } from "./globalStores";
import { Action, TransactionManager } from "./TransactionManager";
import { Failure } from "./Failure";
import { makeUIServer } from "./serveUI";

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
  const transactionManager = new TransactionManager(options.actions);

  const serveUI = makeUIServer({
    publicFolderPath: join(__dirname, "static"), // Folder where SPA files are located,
    publicFrontendProxyUrl: options.publicFrontendProxyUrl,
  });

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
    if (req.method === "POST" && req.url?.startsWith("/api")) {
      await handleRpc(req, res);
    }
    await serveUI(req, res);
  }).listen(options.port, () => {
    console.log(`Server running at http://localhost:${options.port}`);
  });
}
