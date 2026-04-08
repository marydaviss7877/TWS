/**
 * File Processor Queue — BullMQ removed.
 * Exports a simple wrapper; processing is done inline/async without a queue.
 */

const fileProcessorQueue = {
  async add(jobName, data, opts = {}) {
    // Process asynchronously without a queue
    setImmediate(async () => {
      try {
        const { processFile } = require('./fileProcessor');
        if (typeof processFile === 'function') await processFile(data);
      } catch (error) {
        console.warn('File processor error:', error.message);
      }
    });
    return { id: `local-${Date.now()}` };
  },
  async getJob()  { return null; },
  async getJobs() { return []; },
  async close()   {}
};

console.log('ℹ️  File processor queue running in-process (no Redis/BullMQ)');

module.exports = fileProcessorQueue;
