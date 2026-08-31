export interface AuthorizeCardInput {
  providerIdempotencyKey: string;
  amountInCents: number;
  currency: string;
}

export interface AuthorizeCardResult {
  outcome: 'approved' | 'declined';
  failureReason?: string;
}

export interface GenerateInstrumentInput {
  providerIdempotencyKey: string;
  amountInCents: number;
  currency: string;
}

export interface GenerateInstrumentResult {
  instrumentReference: string;
}

export abstract class PaymentProvider {
  abstract authorize(input: AuthorizeCardInput): Promise<AuthorizeCardResult>;
  abstract generateInstrument(input: GenerateInstrumentInput): Promise<GenerateInstrumentResult>;
}
