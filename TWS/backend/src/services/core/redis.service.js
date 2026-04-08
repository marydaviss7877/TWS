/**
 * Redis Service — replaced with in-memory EventEmitter.
 * Keeps the same interface so callers don't break.
 */
const EventEmitter = require('events');

class RedisService {
  constructor() {
    this._emitter = new EventEmitter();
    this._subscriptions = new Map(); // channel -> Set of handlers
    this.isConnected = false;
  }

  async connect() {
    console.log('ℹ️  Redis service using in-memory EventEmitter (no Redis required)');
    this.isConnected = true;
    // Return stub clients that satisfy the interface
    return { pubClient: this._makeStub(), subClient: this._makeStub() };
  }

  async disconnect() {
    this.isConnected = false;
  }

  getClients() {
    return { pubClient: this._makeStub(), subClient: this._makeStub() };
  }

  isHealthy() { return false; }

  _makeStub() {
    return {
      get:        async () => null,
      set:        async () => 'OK',
      setex:      async () => 'OK',
      del:        async () => 1,
      exists:     async () => 0,
      publish:    async () => 0,
      subscribe:  async () => {},
      unsubscribe: async () => {}
    };
  }
}

module.exports = new RedisService();
