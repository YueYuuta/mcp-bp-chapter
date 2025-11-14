import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// 1️⃣ Crear servidor MCP
const server = new McpServer({
  name: "hello-saiyan-mcp",
  version: "1.0.0",
});

// 2️⃣ Registrar una herramienta simple
server.registerTool(
  "say_hello",
  {
    title: "Saludo Saiyan",
    description: "Devuelve un saludo Saiyan personalizado.",
    inputSchema: { name: z.string().describe("Nombre del guerrero Saiyan") },
  },
  async ({ name }) => {
    const message = `👊 ¡Hola ${name}! Tu poder de pelea está por encima de los 9000! ⚡`;
    return {
      content: [{ type: "text", text: message }],
      structuredContent: { message },
    };
  }
);

// 3️⃣ Conectar por stdio (para que lo use el host, como Claude o Cursor)
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("MCP Hello Saiyan listo por stdio 💥");
