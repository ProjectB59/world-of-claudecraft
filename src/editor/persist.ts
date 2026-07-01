// Save/load for CustomMap documents. Split, like src/ui/theme.ts, into a pure
// never-throws (de)serializer and a thin localStorage store. A map is a plain
// JSON artifact, so it round-trips to a file and back. Parsing/validation is
// the SHARED sanitizer in src/sim/map_doc.ts (the server applies the same one
// to stored documents); this module re-exports it under the editor's historical
// names and keeps the local draft store.

import { sanitizeMapDoc, serializeMapDoc } from '../sim/map_doc';
import type { CustomMap, CustomMapMeta } from './custom_map';

export function serializeMap(map: CustomMap): string {
  return serializeMapDoc(map as unknown as Parameters<typeof serializeMapDoc>[0]);
}

// Parse anything into a CustomMap, or null if it cannot be salvaged (no usable
// zones). Accepts a JSON string or an already-parsed object.
export function parseMap(raw: unknown): CustomMap | null {
  return sanitizeMapDoc(raw) as CustomMap | null;
}

// ---- localStorage store ----------------------------------------------------

const STORE_KEY = 'woc_editor_maps';

interface StoredMaps {
  [id: string]: CustomMap;
}

// Minimal Storage surface so the store is testable with an in-memory mock.
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class MapStore {
  constructor(private readonly storage: KeyValueStore | null = safeLocalStorage()) {}

  private readAll(): StoredMaps {
    if (!this.storage) return {};
    try {
      const raw = this.storage.getItem(STORE_KEY);
      if (!raw) return {};
      const obj = JSON.parse(raw);
      return obj && typeof obj === 'object' ? (obj as StoredMaps) : {};
    } catch {
      return {};
    }
  }

  private writeAll(maps: StoredMaps): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(STORE_KEY, JSON.stringify(maps));
      return true;
    } catch {
      return false;
    }
  }

  list(): CustomMapMeta[] {
    return Object.values(this.readAll())
      .map((m) => parseMap(m)?.meta)
      .filter((m): m is CustomMapMeta => !!m)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  save(map: CustomMap): boolean {
    const all = this.readAll();
    all[map.meta.id] = map;
    return this.writeAll(all);
  }

  load(id: string): CustomMap | null {
    const m = this.readAll()[id];
    return m ? parseMap(m) : null;
  }

  remove(id: string): boolean {
    const all = this.readAll();
    if (!(id in all)) return false;
    delete all[id];
    return this.writeAll(all);
  }
}

function safeLocalStorage(): KeyValueStore | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}
