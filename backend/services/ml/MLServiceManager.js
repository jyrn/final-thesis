/**
 * ML Service Manager
 * Automatically starts and manages Python ML services as child processes
 */

const { spawn } = require('child_process');
const path = require('path');
const axios = require('axios');

class MLServiceManager {
  constructor() {
    this.services = {};
    
    // Add BERT NER service if enabled
    if (process.env.USE_BERT_NER !== 'false') {
      this.services.bertNER = {
        name: 'BERT NER Service',
        script: 'bert_ner_service.py',
        port: 5001,
        process: null,
        ready: false,
        retries: 0,
        maxRetries: 3
      };
    }
    
    // Add Layout Analysis service if enabled
    if (process.env.USE_LAYOUT_ANALYSIS !== 'false') {
      this.services.layoutAnalysis = {
        name: 'Layout Analysis Service',
        script: 'document_layout_analyzer.py',
        port: 5002,
        process: null,
        ready: false,
        retries: 0,
        maxRetries: 3
      };
    }
    
    // Add OCR service if enabled
    if (process.env.USE_OCR === 'true') {
      this.services.ocr = {
        name: 'OCR Service',
        script: 'enhanced_ocr_service.py',
        port: 5003,
        process: null,
        ready: false,
        retries: 0,
        maxRetries: 3
      };
    }

    this.pythonPath = process.env.PYTHON_PATH || 'python';
    this.servicesDir = path.join(__dirname);
    this.startupDelay = 2000; // Wait 2s between service starts
    this.healthCheckInterval = 30000; // Check health every 30s
    this.healthCheckTimer = null;
  }

  /**
   * Start all ML services
   */
  async startAll() {
    console.log('Starting ML services...');

    // Check if Python is available
    const pythonAvailable = await this.checkPython();
    if (!pythonAvailable) {
      console.warn('Python not found. ML services disabled.');
      return false;
    }

    // Start services sequentially with delay
    for (const [key, service] of Object.entries(this.services)) {
      await this.startService(key);
      await this.sleep(this.startupDelay);
    }

    // Wait for all services to be ready
    await this.waitForAllReady();

    // Start health check monitoring
    this.startHealthCheckMonitoring();

    console.log('ML services ready');
    return true;
  }

  /**
   * Start a single service
   */
  async startService(serviceKey) {
    const service = this.services[serviceKey];

    const scriptPath = path.join(this.servicesDir, service.script);

    try {
      // Spawn Python process
      const childProcess = spawn(this.pythonPath, [scriptPath], {
        cwd: this.servicesDir,
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      service.process = childProcess;

      // Handle stdout
      childProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          // Check if service is ready
          if (output.includes('Running on') || output.includes('started')) {
            service.ready = true;
          }
        }
      });

      // Handle stderr (suppress INFO logs, only show actual errors)
      childProcess.stderr.on('data', (data) => {
        const error = data.toString().trim();
        // Only log actual errors, not INFO/DEBUG messages
        if (error && !error.includes('INFO:') && !error.includes('WARNING:') && error.includes('ERROR')) {
          console.error(`[${service.name}] ${error}`);
        }
      });

      // Handle process exit
      childProcess.on('exit', (code) => {
        service.ready = false;
        service.process = null;

        // Auto-restart if not intentional shutdown
        if (code !== 0 && service.retries < service.maxRetries) {
          service.retries++;
          setTimeout(() => this.startService(serviceKey), 5000);
        }
      });

      // Handle errors
      childProcess.on('error', (err) => {
        console.error(`   [${service.name}] Failed to start: ${err.message}`);
        service.ready = false;
      });


    } catch (error) {
      console.error(`Failed to start ${service.name}: ${error.message}`);
      service.ready = false;
    }
  }

  /**
   * Wait for all services to be ready
   */
  async waitForAllReady(timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      let allReady = true;

      for (const [key, service] of Object.entries(this.services)) {
        if (!service.ready) {
          // Try health check
          try {
            await axios.get(`http://localhost:${service.port}/health`, { timeout: 2000 });
            service.ready = true;
          } catch (error) {
            allReady = false;
          }
        }
      }

      if (allReady) {
        return true;
      }

      await this.sleep(1000);
    }

    return false;
  }

  /**
   * Check if Python is available
   */
  async checkPython() {
    return new Promise((resolve) => {
      const pythonCheck = spawn(this.pythonPath, ['--version'], { stdio: 'pipe' });
      
      let output = '';
      pythonCheck.stdout.on('data', (data) => output += data.toString());
      pythonCheck.stderr.on('data', (data) => output += data.toString());
      
      pythonCheck.on('close', (code) => {
        if (code === 0 && output.includes('Python')) {
          resolve(true);
        } else {
          resolve(false);
        }
      });

      pythonCheck.on('error', () => resolve(false));
    });
  }

  /**
   * Start health check monitoring
   */
  startHealthCheckMonitoring() {
    this.healthCheckTimer = setInterval(async () => {
      for (const [key, service] of Object.entries(this.services)) {
        if (service.process && service.ready) {
          try {
            await axios.get(`http://localhost:${service.port}/health`, { timeout: 5000 });
          } catch (error) {
            service.ready = false;
          }
        }
      }
    }, this.healthCheckInterval);
  }

  /**
   * Stop all services
   */
  async stopAll() {
    // Clear health check timer
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    for (const [key, service] of Object.entries(this.services)) {
      if (service.process) {
        service.process.kill('SIGTERM');
        service.ready = false;
        service.process = null;
      }
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    const status = {};
    
    for (const [key, service] of Object.entries(this.services)) {
      status[key] = {
        name: service.name,
        port: service.port,
        running: service.process !== null,
        ready: service.ready,
        pid: service.process?.pid || null
      };
    }

    return status;
  }

  /**
   * Check if all services are ready
   */
  isReady() {
    return Object.values(this.services).every(s => s.ready);
  }

  /**
   * Check if any service is running
   */
  isRunning() {
    return Object.values(this.services).some(s => s.process !== null);
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new MLServiceManager();
    }
    return instance;
  },
  MLServiceManager
};
