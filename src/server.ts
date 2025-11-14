// src/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  fetchSaiyansZ,
  powerScore,
  simulateBattle,
  type Character,
} from "./dragonball.js";

// 1) Instancia MCP
const server = new McpServer({
  name: "dragonball-saiyan-mcp",
  version: "1.0.0",
});

// ------- Herramienta A: listar y rankear Saiyans del Z -------
server.registerTool(
  "list_saiyans_z",
  {
    title: "Top Saiyans Z",
    description:
      "Lista Saiyans del equipo Z desde la API pública y retorna ranking por poder estimado.",
    // shapes, no z.object(...)
    inputSchema: {
      limit: z.number().int().positive().max(50).optional(),
      sort: z.enum(["power", "name"]).optional(),
    },
    outputSchema: {
      items: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          power: z.number(),
          image: z.string().nullable(),
          transformations: z.array(z.string()),
        })
      ),
    },
  },
  async ({ limit = 10, sort = "power" }) => {
    const data = await fetchSaiyansZ();
    const withScore = data.map((c) => ({
      id: c.id,
      name: c.name,
      power: powerScore(c),
      image: c.image ?? null,
      transformations: c.transformations?.map((t) => t.name) ?? [],
    }));

    const sorted =
      sort === "name"
        ? withScore.sort((a, b) => a.name.localeCompare(b.name))
        : withScore.sort((a, b) => b.power - a.power);

    const out = { items: sorted.slice(0, limit) };

    return {
      content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
      structuredContent: out,
    };
  }
);

// ------- Herramienta B: perfil de personaje -------
server.registerTool(
  "saiyan_profile",
  {
    title: "Perfil Saiyan",
    description:
      "Devuelve un perfil analítico (poder, estilo y puntos fuertes/débiles) de un Saiyan del equipo Z.",
    inputSchema: {
      name: z.string().min(2),
    },
    outputSchema: {
      id: z.number(),
      name: z.string(),
      powerScore: z.number(),
      race: z.string().nullable(),
      affiliation: z.string().nullable(),
      transformations: z.array(z.string()),
      style: z.object({
        hints: z.array(z.string()),
        strengths: z.array(z.string()),
        weaknesses: z.array(z.string()),
      }),
      image: z.string().nullable(),
    },
  },
  async ({ name }) => {
    const list = await fetchSaiyansZ();
    const c =
      list.find((x) => x.name.toLowerCase() === name.toLowerCase()) ??
      list.find((x) => x.name.toLowerCase().includes(name.toLowerCase()));

    if (!c) {
      return {
        isError: true,
        content: [{ type: "text", text: `No encontré a "${name}".` }],
      };
    }

    const score = powerScore(c);
    const styleHints: string[] = [];
    if ((c.transformations?.length ?? 0) >= 3)
      styleHints.push("alta adaptabilidad");
    if ((c.description ?? "").toLowerCase().includes("calm"))
      styleHints.push("mente fría");
    if ((c.description ?? "").toLowerCase().includes("pride"))
      styleHints.push("orgullo guerrero");

    const out = {
      id: c.id,
      name: c.name,
      powerScore: score,
      race: c.race,
      affiliation: c.affiliation,
      transformations: c.transformations?.map((t) => t.name) ?? [],
      style: {
        hints: styleHints,
        strengths: ["resistencia", "potencial de crecimiento"],
        weaknesses: ["desgaste energético en transformaciones largas"],
      },
      image: c.image ?? null,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
      structuredContent: out,
    };
  }
);

// ------- Herramienta C: simulador de combate -------
server.registerTool(
  "simulate_battle",
  {
    title: "Simulador de combate",
    description:
      "Simula un combate simple entre dos Saiyans del equipo Z y devuelve ganador, margen y log.",
    inputSchema: {
      a: z.string().min(2),
      b: z.string().min(2),
    },
    outputSchema: {
      winner: z.object({ name: z.string(), score: z.number() }),
      loser: z.object({ name: z.string(), score: z.number() }),
      margin: z.string(),
      log: z.array(z.string()),
    },
  },
  async ({ a, b }) => {
    const list = await fetchSaiyansZ();
    const pick = (q: string): Character | undefined =>
      list.find((x) => x.name.toLowerCase() === q.toLowerCase()) ??
      list.find((x) => x.name.toLowerCase().includes(q.toLowerCase()));

    const A = pick(a);
    const B = pick(b);

    if (!A || !B) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `No pude emparejar a "${a}" y/o "${b}" con Saiyans del equipo Z.`,
          },
        ],
      };
    }

    const result = simulateBattle(A, B);
    return {
      content: [
        { type: "text", text: JSON.stringify(result, null, 2) },
        {
          type: "text",
          text: `Ganador: ${result.winner.name} (margen ${result.margin}).`,
        },
      ],
      structuredContent: result,
    };
  }
);

// 2) Conectar por stdio (ideal para Claude/Cursor)
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("MCP server dragonball-saiyan-mcp listo por stdio.");
