// src/dragonball.ts
import { setTimeout as delay } from "node:timers/promises";

export type Character = {
  id: number;
  name: string;
  race: string | null;
  affiliation: string | null;
  ki?: number | null; // algunos endpoints incluyen stats
  maxKi?: number | null;
  transformations?: Array<{ name: string; multiplier?: number }>;
  gender?: string | null;
  description?: string | null;
  image?: string | null;
};

const BASE =
  "https://dragonball-api.com/api/characters?race=Saiyan&affiliation=Z fighter";

/** Fetch con pequeño retry y ablandamiento de fallos */
export async function fetchSaiyansZ(retries = 2): Promise<Character[]> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(BASE, {
        headers: { "user-agent": "mcp-dragonball/1.0" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Character[] | { items?: Character[] };
      // algunas variantes devuelven { items: [] }
      const list = Array.isArray(data) ? data : data.items ?? [];
      return list.map(normalizeChar);
    } catch (err) {
      lastErr = err;
      if (i < retries) await delay(250 * (i + 1));
    }
  }
  throw lastErr;
}

function normalizeChar(c: any): Character {
  const clean = (s: any) => (typeof s === "string" ? s.trim() : s ?? null);
  return {
    id: Number(c.id ?? c._id ?? 0),
    name: clean(c.name),
    race: clean(c.race),
    affiliation: clean(c.affiliation),
    ki: numOrNull(c.ki),
    maxKi: numOrNull(c.maxKi),
    transformations: Array.isArray(c.transformations)
      ? c.transformations.map((t: any) => ({
          name: clean(t?.name) ?? "Unknown",
          multiplier: numOrNull(t?.multiplier) ?? undefined,
        }))
      : [],
    gender: clean(c.gender),
    description: clean(c.description),
    image: clean(c.image),
  };
}

function numOrNull(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Heurística simple: poder base preferente `maxKi || ki || 1000` */
export function powerScore(c: Character): number {
  const base = c.maxKi ?? c.ki ?? 1000;
  // bonificación por transformaciones conocidas
  const bonus =
    (c.transformations ?? []).reduce((acc, t) => {
      const mult = t.multiplier ?? guessMultiplier(t.name);
      return acc + (mult - 1);
    }, 0) * 1000;
  // pequeño boost por “Z fighter” (ya filtrado, pero por si acaso)
  const team = (c.affiliation ?? "").toLowerCase().includes("z") ? 500 : 0;
  return Math.max(1, Math.round(base + bonus + team));
}

function guessMultiplier(name?: string | null): number {
  if (!name) return 1;
  const n = name.toLowerCase();
  if (n.includes("super saiyan 3")) return 4;
  if (n.includes("super saiyan 2")) return 3;
  if (n.includes("super saiyan blue")) return 6;
  if (n.includes("ultra instinct")) return 8;
  if (n.includes("super saiyan")) return 2;
  return 1.2;
}

/** Simulación de combate MUY simple con logs narrativos */
export function simulateBattle(a: Character, b: Character) {
  const pa = powerScore(a);
  const pb = powerScore(b);

  // ventaja aleatoria leve (crit, entorno, estrategia)
  const variance = () => 0.9 + Math.random() * 0.2;
  const ra = pa * variance();
  const rb = pb * variance();

  const winner = ra === rb ? (Math.random() > 0.5 ? a : b) : ra > rb ? a : b;
  const loser = winner === a ? b : a;

  const diff = Math.abs(ra - rb);
  const margin =
    diff / Math.max(pa, pb) > 0.35
      ? "contundente"
      : diff / Math.max(pa, pb) > 0.15
      ? "ajustada"
      : "muy reñida";

  const log = [
    `Comienza el combate: ${a.name} vs ${b.name}.`,
    `${a.name} (poder ~${Math.round(pa)}) y ${b.name} (poder ~${Math.round(
      pb
    )}).`,
    `${winner.name} domina con una ventaja ${margin}.`,
  ];

  return {
    winner: { name: winner.name, score: Math.round(winner === a ? ra : rb) },
    loser: { name: loser.name, score: Math.round(winner === a ? rb : ra) },
    margin,
    log,
  };
}
