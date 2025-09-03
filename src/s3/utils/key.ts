import { nanoid } from 'nanoid';

export function generateS3Key(groupId: string, fileExtension: string): string {
  return `groups/${groupId}/images/${nanoid(16)}.${fileExtension}`;
}

export function validateS3Key(key: string, expectedGroupId: string): boolean {
  const s3KeyPattern = /^groups\/([^\/]+)\/images\/[^\/]+\.[a-zA-Z0-9]+$/;
  const match = key.match(s3KeyPattern);
  
  if (!match) {
    return false;
  }
  
  const keyGroupId = match[1];
  return keyGroupId === expectedGroupId;
}

export function extractGroupIdFromKey(key: string): string | null {
  const s3KeyPattern = /^groups\/([^\/]+)\/images\/[^\/]+\.[a-zA-Z0-9]+$/;
  const match = key.match(s3KeyPattern);
  
  return match ? match[1] : null;
}