import { elasticClient } from '../config/elasticsearch';

const EMAIL_INDEX = 'emails';

interface EmailDocument {
  id: string;
  userId: string;
  senderId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string;
  sentAt: string | null;
  createdAt: string;
}

/**
 * Index an email document in Elasticsearch
 */
export async function indexEmail(doc: EmailDocument): Promise<void> {
  try {
    await elasticClient.index({
      index: EMAIL_INDEX,
      id: doc.id,
      body: doc,
    });
  } catch (error) {
    console.error('[Elasticsearch] Failed to index email:', error);
  }
}

/**
 * Update an existing email document in Elasticsearch
 */
export async function updateEmailIndex(
  emailId: string,
  updates: Partial<EmailDocument>
): Promise<void> {
  try {
    await elasticClient.update({
      index: EMAIL_INDEX,
      id: emailId,
      body: {
        doc: updates,
      },
    });
  } catch (error) {
    console.error('[Elasticsearch] Failed to update email index:', error);
  }
}

/**
 * Search emails using full-text search across subject, body, recipientEmail
 */
export async function searchEmails(
  userId: string,
  query: string,
  status?: string,
  page: number = 1,
  limit: number = 20
): Promise<{ results: EmailDocument[]; total: number }> {
  try {
    const must: any[] = [
      { term: { userId } },
    ];

    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['subject', 'body', 'recipientEmail', 'senderEmail'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    }

    if (status) {
      must.push({ term: { status } });
    }

    const response = await elasticClient.search({
      index: EMAIL_INDEX,
      body: {
        query: { bool: { must } },
        from: (page - 1) * limit,
        size: limit,
        sort: [{ scheduledAt: { order: 'desc' } }],
      },
    });

    const hits = response.hits.hits;
    const total = typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value || 0;

    return {
      results: hits.map((hit: any) => hit._source as EmailDocument),
      total,
    };
  } catch (error) {
    console.error('[Elasticsearch] Search failed:', error);
    return { results: [], total: 0 };
  }
}

/**
 * Delete an email document from Elasticsearch
 */
export async function deleteEmailFromIndex(emailId: string): Promise<void> {
  try {
    await elasticClient.delete({
      index: EMAIL_INDEX,
      id: emailId,
    });
  } catch (error) {
    console.error('[Elasticsearch] Failed to delete email from index:', error);
  }
}
