
import { expect } from 'chai';
import { db } from '../server/db';
import { agentService } from '../server/services/agent-service';
import { blockchainService } from '../server/services/blockchain';
import { citizenRequestService } from '../server/services/citizen-request-service';

describe('Agent Smith Platform - System Tests', () => {
  before(async () => {
    // Initialize services
    await agentService.initialize();
    await db.connect();
  });

  after(async () => {
    await db.disconnect();
  });

  describe('Core System Integration', () => {
    it('should handle end-to-end citizen request flow', async () => {
      // Create request
      const request = await citizenRequestService.create({
        fullName: 'Test User',
        contactInfo: 'test@example.com',
        subject: 'Test Request',
        description: 'Test Description',
        priority: 'medium'
      });
      
      expect(request.id).to.exist;
      expect(request.status).to.equal('new');

      // Process with AI
      const processResult = await agentService.processRequest(request.id);
      expect(processResult.success).to.be.true;
      expect(processResult.classification).to.exist;

      // Verify blockchain record
      const blockchainRecord = await blockchainService.getRecordByEntityId(request.id);
      expect(blockchainRecord).to.exist;
    });

    it('should maintain data consistency across services', async () => {
      // Test data flow between services
      const testData = {
        requestId: 'test-123',
        agentId: 'agent-123',
        result: 'test-result'
      };

      // Verify data consistency
      const storedResult = await db.getAgentResult(testData.requestId);
      expect(storedResult).to.deep.equal(testData);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent request processing', async () => {
      const requests = Array(10).fill(null).map(() => ({
        fullName: 'Test User',
        contactInfo: 'test@example.com',
        subject: 'Concurrent Test',
        description: 'Test Description',
        priority: 'medium'
      }));

      const results = await Promise.all(
        requests.map(req => citizenRequestService.create(req))
      );

      expect(results).to.have.lengthOf(10);
      results.forEach(result => {
        expect(result.id).to.exist;
      });
    });
  });
});
