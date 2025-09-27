import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LlamaIndexAgent } from "@ag-ui/llamaindex";

import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
 
  const runtime = new CopilotRuntime({
    agents: {
      lawyer_copilot: new LlamaIndexAgent({
        url: "http://127.0.0.1:9000/run",
      })
    }
  })

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: `/api/copilotkit`,
  });

  return handleRequest(request);
}
