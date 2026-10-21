import fs from 'fs';
import os from 'os';
import path from 'path';
import { JarvisAgentRegistry } from './jarvis-agent-registry';
import { JarvisAuditLog } from './jarvis-audit-log';
import { JarvisModelGateway } from './jarvis-model-gateway';

describe('JarvisAgentRegistry', () => {
	it('returns capability-limited built-in roles', () => {
		const registry = new JarvisAgentRegistry();
		expect(registry.canHandle('research-analyst', 'research')).toBe(true);
		expect(registry.canHandle('code-reviewer', 'code_review')).toBe(true);
		expect(registry.canHandle('workspace-indexer', 'workspace_index')).toBe(
			false,
		);
		expect(registry.canHandle('missing-agent', 'research')).toBe(false);
	});
});

describe('JarvisAuditLog', () => {
	let directory: string;

	beforeEach(() => {
		directory = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-audit-'));
	});

	afterEach(() => {
		fs.rmSync(directory, { recursive: true, force: true });
	});

	it('writes allowlisted metadata without copying arbitrary sensitive fields', () => {
		const audit = new JarvisAuditLog(directory);
		audit.write({
			event: 'model_request_started',
			actor: 'user',
			correlationId: 'test-correlation-1',
			prompt: 'this should never be logged',
			apiKey: 'fake-secret-for-test',
		} as never);

		const content = fs.readFileSync(
			path.join(directory, 'audit-events.jsonl'),
			'utf8',
		);
		expect(content).toContain('model_request_started');
		expect(content).not.toContain('this should never be logged');
		expect(content).not.toContain('fake-secret-for-test');
	});
});

describe('JarvisModelGateway', () => {
	let directory: string;

	beforeEach(() => {
		directory = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-gateway-'));
	});

	afterEach(() => {
		fs.rmSync(directory, { recursive: true, force: true });
	});

	it('returns a correlation ID and audits a successful request', async () => {
		const audit = new JarvisAuditLog(directory);
		const gateway = new JarvisModelGateway(audit, async () => 'test answer');
		const result = await gateway.complete('test prompt');

		expect(result.text).toBe('test answer');
		expect(result.correlationId).toBeTruthy();
		expect(
			fs.readFileSync(path.join(directory, 'audit-events.jsonl'), 'utf8'),
		).toContain('model_request_succeeded');
	});

	it('audits failures without persisting the provider error message', async () => {
		const audit = new JarvisAuditLog(directory);
		const gateway = new JarvisModelGateway(audit, async () => {
			throw new Error('sensitive provider details should not be logged');
		});

		await expect(gateway.complete('test prompt')).rejects.toThrow(
			'sensitive provider details should not be logged',
		);
		const content = fs.readFileSync(
			path.join(directory, 'audit-events.jsonl'),
			'utf8',
		);
		expect(content).toContain('model_request_failed');
		expect(content).not.toContain(
			'sensitive provider details should not be logged',
		);
	});
});
