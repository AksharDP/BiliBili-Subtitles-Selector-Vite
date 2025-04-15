// Mock implementation of IndexedDB for tests
class MockIDBRequest {
  result: any = null;
  error: Error | null = null;
  source: any = null;
  transaction: any = null;
  readyState: string = "pending";
  onsuccess: ((this: any, ev: Event) => any) | null = null;
  onerror: ((this: any, ev: Event) => any) | null = null;
  onupgradeneeded: ((this: any, ev: IDBVersionChangeEvent) => any) | null = null;

  triggerSuccess() {
    if (this.onsuccess) {
      this.onsuccess({ target: this } as unknown as Event);
    }
  }
  
  triggerError(error: Error) {
    this.error = error;
    if (this.onerror) {
      this.onerror({ target: this } as unknown as Event);
    }
  }
}

class MockIDBObjectStore {
  name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  put(value: any, key?: any): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => {
      request.result = key || value.id || Date.now();
      request.triggerSuccess();
    }, 0);
    return request;
  }
  
  get(key: any): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => {
      request.result = null; // Default to null (not found)
      request.triggerSuccess();
    }, 0);
    return request;
  }
  
  delete(key: any): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => {
      request.result = undefined;
      request.triggerSuccess();
    }, 0);
    return request;
  }
  
  clear(): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => {
      request.result = undefined;
      request.triggerSuccess();
    }, 0);
    return request;
  }
  
  count(): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => {
      request.result = 0;
      request.triggerSuccess();
    }, 0);
    return request;
  }
}

class MockIDBTransaction {
  db: MockIDBDatabase;
  mode: IDBTransactionMode;
  objectStoreNames: string[];
  oncomplete: ((ev: Event) => any) | null = null;
  onerror: ((ev: Event) => any) | null = null;
  
  constructor(db: MockIDBDatabase, storeNames: string[], mode: IDBTransactionMode) {
    this.db = db;
    this.objectStoreNames = storeNames;
    this.mode = mode;
  }
  
  objectStore(name: string): MockIDBObjectStore {
    return new MockIDBObjectStore(name);
  }
  
  commit(): void {
    setTimeout(() => {
      if (this.oncomplete) {
        this.oncomplete({} as Event);
      }
    }, 0);
  }
}

class MockIDBDatabase {
  name: string;
  version: number;
  objectStoreNames: string[] = [];
  
  constructor(name: string, version: number) {
    this.name = name;
    this.version = version;
  }
  
  createObjectStore(name: string, options?: { keyPath?: string | null; autoIncrement?: boolean }): MockIDBObjectStore {
    if (!this.objectStoreNames.includes(name)) {
      this.objectStoreNames.push(name);
    }
    return new MockIDBObjectStore(name);
  }
  
  transaction(storeNames: string | string[], mode: IDBTransactionMode = "readonly"): MockIDBTransaction {
    const storeNamesArray = typeof storeNames === 'string' ? [storeNames] : storeNames;
    return new MockIDBTransaction(this, storeNamesArray, mode);
  }
  
  close(): void {}
  
  deleteObjectStore(name: string): void {
    this.objectStoreNames = this.objectStoreNames.filter(n => n !== name);
  }
}

class MockIDBFactory {
  databases: Record<string, MockIDBDatabase> = {};
  
  open(name: string, version?: number): MockIDBRequest {
    const request = new MockIDBRequest();
    
    setTimeout(() => {
      const db = new MockIDBDatabase(name, version || 1);
      this.databases[name] = db;
      request.result = db;
      
      if (request.onupgradeneeded) {
        request.onupgradeneeded({ target: request } as unknown as IDBVersionChangeEvent);
      }
      
      request.triggerSuccess();
    }, 0);
    
    return request;
  }
  
  deleteDatabase(name: string): MockIDBRequest {
    const request = new MockIDBRequest();
    
    setTimeout(() => {
      delete this.databases[name];
      request.triggerSuccess();
    }, 0);
    
    return request;
  }
}

// Export the mock factory
export const mockIndexedDB = new MockIDBFactory();