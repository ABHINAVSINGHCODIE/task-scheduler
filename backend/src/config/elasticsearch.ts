import { Client } from '@elastic/elasticsearch';
import { env } from './env';

export const elasticClient = new Client({
  node: env.ELASTICSEARCH_NODE,
  requestTimeout: 1000,
  maxRetries: 0,
});

const EMAIL_INDEX = 'emails';

export async function initializeElasticsearch(): Promise<void> {
  try {
    const ping = await elasticClient.ping();
    console.log('[Elasticsearch] Connected successfully.');

    const indexExists = await elasticClient.indices.exists({ index: EMAIL_INDEX });

    if (!indexExists) {
      await elasticClient.indices.create({
        index: EMAIL_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              senderId: { type: 'keyword' },
              senderEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              recipientEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              subject: { type: 'text', analyzer: 'standard' },
              body: { type: 'text', analyzer: 'standard' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              createdAt: { type: 'date' },
            },
          },
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
          },
        },
      });
      console.log(`[Elasticsearch] Index "${EMAIL_INDEX}" created.`);
    } else {
      console.log(`[Elasticsearch] Index "${EMAIL_INDEX}" already exists.`);
    }
  } catch (error) {
    console.error('[Elasticsearch] Initialization error:', error);
    console.warn('[Elasticsearch] Continuing without Elasticsearch. Search features may not work.');
  }
}
