import type { ProviderAdapter } from "./adapter.js";

export class AdapterRegistry {
  private adapters = new Map<string, ProviderAdapter>();

  register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.type, adapter);
  }

  get(type: string): ProviderAdapter {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw new Error(`Unknown adapter type: "${type}"`);
    }
    return adapter;
  }

  has(type: string): boolean {
    return this.adapters.has(type);
  }
}
