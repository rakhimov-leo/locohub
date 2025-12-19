import { Injectable } from '@nestjs/common';

@Injectable()
export class LocohubBatchService {
  getHello(): string {
    return 'Welcome to Batch Server!';
  }
}
