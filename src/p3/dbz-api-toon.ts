import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Crear servidor MCP
const server = new McpServer({
  name: "toon-json-demo-mcp",
  version: "1.0.0",
});

// Convierte un array de objetos plano a un TOON tipo tabla
function arrayToToon(entityName: string, rows: any[]): string {
  if (rows.length === 0) {
    return `${entityName}[]{}:`; // caso vacío
  }

  const keys = Object.keys(rows[0]); // asumimos mismo shape
  const header = `${entityName}[${rows.length}]{${keys.join(",")}}:`;

  const body = rows
    .map((row) => {
      const values = keys.map((k) => String(row[k]));
      return "  " + values.join(",");
    })
    .join("\n");

  return `${header}\n${body}`;
}

// Herramienta MCP
server.registerTool(
  "compare_formats",
  {
    title: "Comparar JSON vs TOON",
    description:
      "Devuelve una lista de Saiyans en JSON y en TOON para comparar reducción de tokens.",
    inputSchema: {
      // El nombre aquí es solo para personalizar un mensaje, los datos son fijos
      name: z.string().describe("Nombre de la persona que hace la consulta"),
    },
  },
  async ({ name }) => {
    // Array de ejemplo (sin API, datos fijos)
    const saiyans = [
      { id: 1, name: "Goku", power: 90000000, race: "Saiyan" },
      { id: 2, name: "Vegeta", power: 85000000, race: "Saiyan" },
      { id: 3, name: "Gohan", power: 75000000, race: "Saiyan-Hybrid" },
    ];

    const jsonText = JSON.stringify(saiyans, null, 2);
    const toonText = arrayToToon("saiyans", saiyans);

    const introMessage =
      `Hola ${name}. Aquí tienes el mismo conjunto de datos ` +
      `representado en JSON y en TOON para comparar.`;

    return {
      content: [
        { type: "text", text: introMessage },
        { type: "text", text: "\n--- JSON ---\n" + jsonText },
        { type: "text", text: "\n--- TOON ---\n" + toonText },
      ],
      structuredContent: {
        saiyans,
        json: jsonText,
        toon: toonText,
      },
    };
  }
);

// Conectar por stdio
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("MCP TOON vs JSON (array) listo por stdio");
