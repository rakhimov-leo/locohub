import { Controller, Get } from '@nestjs/common';
import { LocohubBatchService } from './locohub-batch.service';

@Controller()
export class LocohubBatchController {
  constructor(private readonly locohubBatchService: LocohubBatchService) {}

  @Get()
  getHello(): string {
    return this.locohubBatchService.getHello();
  }
}
