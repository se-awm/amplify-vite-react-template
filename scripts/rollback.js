// import { execSync } from 'child_process';

// try {
//   console.log("Rolling back to the previous stable deployment...");
//   execSync('git reset --hard HEAD~1');
//   execSync('git push --force');
//   console.log("Rollback successful.");
// } catch (error) {
//   console.error("Rollback failed:", error.message);
//   process.exit(1);
// }
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, copyFileSync, writeFileSync, unlinkSync } from 'fs';
import { join, basename } from 'path';

class DeploymentRollback {
    constructor(config = {}) {
        this.config = {
            maxRollbackAttempts: config.maxRollbackAttempts || 3,
            healthCheckEndpoint: config.healthCheckEndpoint || '/api/health',
            healthCheckTimeout: config.healthCheckTimeout || 30000,
            backupDir: config.backupDir || '.deployment-backups',
            slackWebhook: config.slackWebhook, // || process.env.SLACK_WEBHOOK_URL,
            ...config
        };
        
        this.deploymentHistory = [];
        this.currentAttempt = 0;
    }

    async initialize() {
        if (!existsSync(this.config.backupDir)) {
            mkdirSync(this.config.backupDir);
        }

        const historyPath = join(this.config.backupDir, 'deployment-history.json');
        if (existsSync(historyPath)) {
            this.deploymentHistory = JSON.parse(readFileSync(historyPath, 'utf8'));
        }
    }

    async createDeploymentBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupInfo = {
            timestamp,
            commit: execSync('git rev-parse HEAD').toString().trim(),
            branch: execSync('git rev-parse --abbrev-ref HEAD').toString().trim(),
            files: []
        };

        const filesToBackup = [
            'package.json',
            'amplify/backend/backend-config.json',
            'src/aws-exports.js'
        ];

        for (const file of filesToBackup) {
            if (existsSync(file)) {
                const backupPath = join(this.config.backupDir, `${timestamp}-${basename(file)}`);
                copyFileSync(file, backupPath);
                backupInfo.files.push(backupPath);
            }
        }

        this.deploymentHistory.push(backupInfo);
        this.saveDeploymentHistory();

        return backupInfo;
    }

    async performHealthCheck() {
    //   if (!this.config.healthCheckEndpoint || this.config.healthCheckEndpoint === '/api/health') {
    //       console.log('Skipping health check - no valid endpoint configured');
    //       return true;
    //   }
  
    //   try {
    //       console.log(`Performing health check against ${this.config.healthCheckEndpoint}`);
    //       const response = await fetch(this.config.healthCheckEndpoint);
    //       const isHealthy = response.status === 200;
    //       console.log(`Health check ${isHealthy ? 'passed' : 'failed'} with status ${response.status}`);
    //       return isHealthy;
    //   } catch (error) {
    //       console.error('Health check failed:', error);
    //       return false;
    //   }
    return true;
  }

    async notifyTeam(message, level = 'info') {
        if (this.config.slackWebhook) {
            try {
                await fetch(this.config.slackWebhook, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: message,
                        color: level === 'error' ? 'danger' : 'good'
                    })
                });
            } catch (error) {
                console.error('Failed to send Slack notification:', error);
            }
        }
    }

    async rollback() {
      try {
          this.currentAttempt++;
          console.log(`Attempting rollback (${this.currentAttempt}/${this.config.maxRollbackAttempts})`);
  
          const lastDeployment = this.deploymentHistory[this.deploymentHistory.length - 2];
          if (!lastDeployment) {
              throw new Error('No previous deployment found to rollback to');
          }
  
          execSync(`git reset --hard ${lastDeployment.commit}`);
          execSync('git push --force');
  
          for (const filePath of lastDeployment.files) {
              const fileName = basename(filePath).replace(`${lastDeployment.timestamp}-`, '');
              copyFileSync(filePath, fileName);
          }
  
          execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
  
          execSync('npm run build', { stdio: 'inherit' });
  
        //   const isHealthy = await this.performHealthCheck();
        //   if (!isHealthy) {
        //       throw new Error('Health check failed after rollback');
        //   }
  
          await this.notifyTeam('🔄 Rollback completed successfully');
          console.log('Rollback completed successfully');
          return true;
  
      } catch (error) {
          console.error('Rollback failed:', error);
          await this.notifyTeam(`❌ Rollback failed: ${error.message}`, 'error');
  
          if (this.currentAttempt < this.config.maxRollbackAttempts) {
              console.log('Retrying rollback...');
              return this.rollback();
          }
  
          throw new Error(`Rollback failed after ${this.config.maxRollbackAttempts} attempts`);
      }
  }

    saveDeploymentHistory() {
        const historyPath = join(this.config.backupDir, 'deployment-history.json');
        writeFileSync(historyPath, JSON.stringify(this.deploymentHistory, null, 2));
    }

    async cleanup() {
        const MAX_BACKUPS = 5;
        if (this.deploymentHistory.length > MAX_BACKUPS) {
            const deploymentsToRemove = this.deploymentHistory.slice(0, -MAX_BACKUPS);
            for (const deployment of deploymentsToRemove) {
                for (const file of deployment.files) {
                    if (existsSync(file)) {
                        unlinkSync(file);
                    }
                }
            }
            this.deploymentHistory = this.deploymentHistory.slice(-MAX_BACKUPS);
            this.saveDeploymentHistory();
        }
    }
}

export default DeploymentRollback;