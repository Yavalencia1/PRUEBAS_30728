import { describe, it, expect } from 'vitest';
import { resolveApiConfig } from './api';

describe('resolveApiConfig', () => {
  it('resuelve un host por defecto válido', () => {
    const config = resolveApiConfig({ host: '127.0.0.1', port: 8000 });
    expect(config.apiBaseUrl).toBe('http://127.0.0.1:8000/api/v1');
    expect(config.wsBaseUrl).toBe('ws://127.0.0.1:8000/ws');
  });

  it('resuelve una URL base desde un host explícito', () => {
    const config = resolveApiConfig({ host: 'localhost', port: 8000, protocol: 'http' });
    expect(config.apiBaseUrl).toBe('http://localhost:8000/api/v1');
    expect(config.wsBaseUrl).toBe('ws://localhost:8000/ws');
  });
});
