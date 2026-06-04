import { eq, and, sql } from "drizzle-orm";
import { modelGroups } from "../../db/schema/model_groups.js";
import { groupEntries } from "../../db/schema/group_entries.js";
import { endpointGroups } from "../../db/schema/endpoint_groups.js";
import { models } from "../../db/schema/models.js";
import type { DbClient } from "../../db/connection.js";

export interface ModelGroupResponse {
  id: string;
  name: string;
  description: string | null;
  interfaceId: string | null;
  entryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupEntryResponse {
  virtualName: string;
  modelId: string | null;
  modelDisplayName: string | null;
}

export interface ModelGroupDetailResponse extends ModelGroupResponse {
  entries: GroupEntryResponse[];
}

function now(): string {
  return new Date().toISOString().replace("T", " ").split(".")[0]!;
}

export function createModelGroup(
  db: DbClient,
  input: { name: string; description?: string; interfaceId?: string },
): ModelGroupDetailResponse {
  if (input.interfaceId) {
    const iface = db.select().from(modelGroups).where(eq(modelGroups.id, input.interfaceId)).get();
    if (!iface) throw new Error("INTERFACE_NOT_FOUND");
  }

  const id = crypto.randomUUID();
  const ts = now();

  db.transaction((tx) => {
    tx.insert(modelGroups).values({
      id,
      name: input.name,
      description: input.description ?? null,
      interfaceId: input.interfaceId ?? null,
      createdAt: ts,
      updatedAt: ts,
    }).run();

    // When implementing an interface, copy its slot names as unmapped entries
    if (input.interfaceId) {
      const ifaceEntries = tx
        .select()
        .from(groupEntries)
        .where(eq(groupEntries.groupId, input.interfaceId))
        .all();
      for (const entry of ifaceEntries) {
        tx.insert(groupEntries).values({
          groupId: id,
          virtualName: entry.virtualName,
          modelId: null,
        }).run();
      }
    }
  });

  return getModelGroup(db, id)!;
}

export function listModelGroups(db: DbClient): ModelGroupResponse[] {
  const groups = db.select().from(modelGroups).all();
  const counts = db
    .select({ groupId: groupEntries.groupId, count: sql<number>`count(*)` })
    .from(groupEntries)
    .groupBy(groupEntries.groupId)
    .all();
  const countMap = new Map(counts.map((c) => [c.groupId, Number(c.count)]));

  return groups.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    interfaceId: row.interfaceId,
    entryCount: countMap.get(row.id) ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export function getModelGroup(db: DbClient, id: string): ModelGroupDetailResponse {
  const row = db.select().from(modelGroups).where(eq(modelGroups.id, id)).get();
  if (!row) throw new Error("NOT_FOUND");

  const entries = db
    .select()
    .from(groupEntries)
    .where(eq(groupEntries.groupId, id))
    .all();

  const resolved: GroupEntryResponse[] = entries.map((e) => {
    let displayName: string | null = null;
    if (e.modelId) {
      const m = db.select().from(models).where(eq(models.id, e.modelId)).get();
      displayName = m?.displayName ?? null;
    }
    return { virtualName: e.virtualName, modelId: e.modelId, modelDisplayName: displayName };
  });

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    interfaceId: row.interfaceId,
    entryCount: resolved.length,
    entries: resolved,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function updateModelGroup(
  db: DbClient,
  input: { id: string; name?: string; description?: string | null },
): ModelGroupDetailResponse {
  const existing = db.select().from(modelGroups).where(eq(modelGroups.id, input.id)).get();
  if (!existing) throw new Error("NOT_FOUND");

  const updates: Partial<typeof modelGroups.$inferInsert> = { updatedAt: now() };
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;

  db.update(modelGroups).set(updates).where(eq(modelGroups.id, input.id)).run();

  return getModelGroup(db, input.id);
}

export function deleteModelGroup(db: DbClient, id: string): { success: boolean } {
  const existing = db.select().from(modelGroups).where(eq(modelGroups.id, id)).get();
  if (!existing) throw new Error("NOT_FOUND");

  // Check if any other groups use this as their interface
  const dependentGroups = db
    .select()
    .from(modelGroups)
    .where(eq(modelGroups.interfaceId, id))
    .all();
  if (dependentGroups.length > 0) {
    throw new Error(`HAS_DEPENDENTS:${JSON.stringify(dependentGroups.map((g) => g.id))}`);
  }

  db.delete(modelGroups).where(eq(modelGroups.id, id)).run();
  return { success: true };
}

export function setGroupEntry(
  db: DbClient,
  input: { groupId: string; virtualName: string; modelId: string | null },
): GroupEntryResponse {
  const group = db.select().from(modelGroups).where(eq(modelGroups.id, input.groupId)).get();
  if (!group) throw new Error("GROUP_NOT_FOUND");

  if (input.modelId) {
    const model = db.select().from(models).where(eq(models.id, input.modelId)).get();
    if (!model) throw new Error("MODEL_NOT_FOUND");
  }

  if (!input.virtualName || input.virtualName.trim() === "") {
    throw new Error("INVALID_VIRTUAL_NAME");
  }

  const existing = db
    .select()
    .from(groupEntries)
    .where(and(eq(groupEntries.groupId, input.groupId), eq(groupEntries.virtualName, input.virtualName)))
    .get();

  db.transaction((tx) => {
    if (existing) {
      tx.update(groupEntries)
        .set({ modelId: input.modelId })
        .where(
          and(
            eq(groupEntries.groupId, input.groupId),
            eq(groupEntries.virtualName, input.virtualName),
          ),
        )
        .run();
    } else {
      tx.insert(groupEntries).values({
        groupId: input.groupId,
        virtualName: input.virtualName,
        modelId: input.modelId,
      }).run();
    }
  });

  let displayName: string | null = null;
  if (input.modelId) {
    const m = db.select().from(models).where(eq(models.id, input.modelId)).get();
    displayName = m?.displayName ?? null;
  }

  return { virtualName: input.virtualName, modelId: input.modelId, modelDisplayName: displayName };
}

export function removeGroupEntry(
  db: DbClient,
  input: { groupId: string; virtualName: string },
): { success: boolean } {
  const existing = db
    .select()
    .from(groupEntries)
    .where(and(eq(groupEntries.groupId, input.groupId), eq(groupEntries.virtualName, input.virtualName)))
    .get();
  if (!existing) throw new Error("NOT_FOUND");

  db.delete(groupEntries)
    .where(
      and(
        eq(groupEntries.groupId, input.groupId),
        eq(groupEntries.virtualName, input.virtualName),
      ),
    )
    .run();

  return { success: true };
}

// Resolve a virtual name from any group attached to an endpoint.
// Returns the actual model ID, or null if not found.
export function resolveGroupVirtualName(
  db: DbClient,
  endpointId: string,
  virtualName: string,
): string | null {
  const row = db
    .select({ modelId: groupEntries.modelId })
    .from(endpointGroups)
    .innerJoin(groupEntries, eq(endpointGroups.groupId, groupEntries.groupId))
    .where(
      and(
        eq(endpointGroups.endpointId, endpointId),
        eq(groupEntries.virtualName, virtualName),
      ),
    )
    .get();

  return row?.modelId ?? null;
}

// Get all mapped group models for an endpoint (for /models listing).
export function getEndpointGroupModels(
  db: DbClient,
  endpointId: string,
): { virtualName: string; modelId: string; createdAt: string }[] {
  const rows = db
    .select({
      virtualName: groupEntries.virtualName,
      modelId: groupEntries.modelId,
      groupCreatedAt: modelGroups.createdAt,
    })
    .from(endpointGroups)
    .innerJoin(modelGroups, eq(endpointGroups.groupId, modelGroups.id))
    .innerJoin(groupEntries, eq(endpointGroups.groupId, groupEntries.groupId))
    .where(eq(endpointGroups.endpointId, endpointId))
    .all();

  return rows
    .filter((r) => r.modelId !== null)
    .map((r) => ({
      virtualName: r.virtualName,
      modelId: r.modelId!,
      createdAt: r.groupCreatedAt,
    }));
}
