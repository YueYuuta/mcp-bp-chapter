import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Tipo mínimo
type DragonBallCharacter = {
  name: string;
  ki?: string;
  maxKi?: string;
};

// URL oficial
const DBZ_SAIYANS_URL =
  "https://dragonball-api.com/api/characters?race=Saiyan&affiliation=Z%20fighter";

// Función simple: busca el personaje y devuelve su poder en texto
async function getSimplePower(name: string): Promise<string | null> {
  try {
    const res = await fetch(DBZ_SAIYANS_URL);

    if (!res.ok) {
      console.error("Error HTTP API:", res.status);
      return null;
    }

    const data = await res.json();

    const list: DragonBallCharacter[] = data;

    const lower = name.toLowerCase();
    const char =
      list.find((c) => c.name?.toLowerCase() === lower) ??
      list.find((c) => c.name?.toLowerCase().includes(lower));

    if (!char) return null;

    return char.maxKi ?? char.ki ?? null;
  } catch (error) {
    console.error("Error API:", error);
    return null;
  }
}

// Crear servidor MCP
const server = new McpServer({
  name: "hello-saiyan-mcp",
  version: "1.0.0",
});

// Herramienta simple
server.registerTool(
  "say_hello",
  {
    title: "Saludo Saiyan",
    description:
      "Devuelve un saludo Saiyan. Si encuentra el personaje en la API, muestra su poder textual sin procesar.",
    inputSchema: { name: z.string() },
  },
  async ({ name }) => {
    const powerText = await getSimplePower(name);

    let message: string;

    if (powerText) {
      message = `Hola ${name}. Según la API, tu poder es: ${powerText}.`;
    } else {
      message = `Hola ${name}. Tu poder de pelea está por encima de los 9000.`;
    }

    return {
      content: [{ type: "text", text: message }],
      structuredContent: { name, powerText, message },
    };
  }
);

// Conectar por stdio
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("MCP Hello Saiyan listo por stdio");
