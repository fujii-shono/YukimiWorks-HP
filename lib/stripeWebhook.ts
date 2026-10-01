import { createHmac, timingSafeEqual } from 'crypto';

const SIGNATURE_TOLERANCE_SECONDS = 60 * 5;

function parseStripeSignature(signatureHeader: string) {
  return signatureHeader.split(',').reduce(
    (result, item) => {
      const [key, value] = item.split('=');
      if (key === 't' && value) result.timestamp = value;
      if (key === 'v1' && value) result.signatures.push(value);
      return result;
    },
    { timestamp: '', signatures: [] as string[] },
  );
}

export function isValidStripeSignature(payload: string, signatureHeader: string, webhookSecret: string) {
  const { timestamp, signatures } = parseStripeSignature(signatureHeader);
  const timestampSeconds = Number(timestamp);
  if (!timestamp || signatures.length === 0 || !Number.isFinite(timestampSeconds)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expectedSignature = createHmac('sha256', webhookSecret).update(`${timestamp}.${payload}`).digest('hex');
  const expected = Buffer.from(expectedSignature, 'hex');
  return signatures.some((signature) => {
    try {
      const received = Buffer.from(signature, 'hex');
      return received.length === expected.length && timingSafeEqual(received, expected);
    } catch {
      return false;
    }
  });
}
