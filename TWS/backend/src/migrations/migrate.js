const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Migration runner
class MigrationRunner {
  constructor() {
    this.migrations = [];
    this.loadMigrations();
  }

  loadMigrations() {
    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir);
    
    files.forEach(file => {
      if (file.endsWith('.js') && file !== 'migrate.js') {
        const migration = require(path.join(migrationsDir, file));
        if (migration && typeof migration.version === 'string') {
          this.migrations.push(migration);
        }
      }
    });
    
    // Sort migrations by version
    this.migrations.sort((a, b) => a.version.localeCompare(b.version));
  }

  async connect() {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/tws';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }

  async getMigrationHistory() {
    const db = mongoose.connection.db;
    
    // Create migrations collection if it doesn't exist
    try {
      await db.createCollection('migrations');
    } catch (error) {
      // Collection already exists
    }
    
    const history = await db.collection('migrations').find().sort({ version: 1 }).toArray();
    return history;
  }

  async recordMigration(version, direction) {
    const db = mongoose.connection.db;
    
    if (direction === 'up') {
      await db.collection('migrations').insertOne({
        version,
        appliedAt: new Date(),
        direction: 'up'
      });
    } else {
      await db.collection('migrations').deleteOne({ version });
    }
  }

  async runMigrations() {
    console.log('Starting migration process...');
    
    await this.connect();
    
    try {
      const history = await this.getMigrationHistory();
      const appliedVersions = history.map(h => h.version);
      
      for (const migration of this.migrations) {
        if (!appliedVersions.includes(migration.version)) {
          console.log(`\nRunning migration ${migration.version}: ${migration.description}`);
          
          try {
            await migration.up(mongoose.connection.db);
            await this.recordMigration(migration.version, 'up');
            console.log(`✅ Migration ${migration.version} completed successfully`);
          } catch (error) {
            console.error(`❌ Migration ${migration.version} failed:`, error);
            throw error;
          }
        } else {
          console.log(`⏭️  Migration ${migration.version} already applied`);
        }
      }
      
      console.log('\n🎉 All migrations completed successfully!');
      
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }

  async rollbackMigration(version) {
    console.log(`Rolling back migration ${version}...`);
    
    await this.connect();
    
    try {
      const migration = this.migrations.find(m => m.version === version);
      if (!migration) {
        throw new Error(`Migration ${version} not found`);
      }
      
      console.log(`Rolling back migration ${migration.version}: ${migration.description}`);
      await migration.down(mongoose.connection.db);
      await this.recordMigration(migration.version, 'down');
      console.log(`✅ Migration ${version} rolled back successfully`);
      
    } catch (error) {
      console.error(`❌ Rollback failed:`, error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async showStatus() {
    await this.connect();
    
    try {
      const history = await this.getMigrationHistory();
      const appliedVersions = history.map(h => h.version);
      
      console.log('\n📊 Migration Status:');
      console.log('==================');
      
      for (const migration of this.migrations) {
        const status = appliedVersions.includes(migration.version) ? '✅ Applied' : '⏳ Pending';
        console.log(`${migration.version}: ${migration.description} - ${status}`);
      }
      
      if (history.length === 0) {
        console.log('\nNo migrations have been applied yet.');
      }
      
    } finally {
      await this.disconnect();
    }
  }
}

// CLI interface
async function main() {
  const runner = new MigrationRunner();
  const command = process.argv[2];
  const version = process.argv[3];
  
  switch (command) {
    case 'up':
      await runner.runMigrations();
      break;
      
    case 'down':
      if (!version) {
        console.error('Please specify a migration version to rollback');
        process.exit(1);
      }
      await runner.rollbackMigration(version);
      break;
      
    case 'status':
      await runner.showStatus();
      break;
      
    default:
      console.log('Usage:');
      console.log('  node migrate.js up          - Run all pending migrations');
      console.log('  node migrate.js down <ver>  - Rollback a specific migration');
      console.log('  node migrate.js status      - Show migration status');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MigrationRunner;
