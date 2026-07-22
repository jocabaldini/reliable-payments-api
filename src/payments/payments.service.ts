import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  getPayment(id: number): string {
    return `Getting payment ${id}`;
  }

  createPayment(data: unknown): string {
    console.log('Data: ', data);
    return 'Creating payment';
  }
}
