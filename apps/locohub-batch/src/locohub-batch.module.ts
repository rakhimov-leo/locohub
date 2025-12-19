import { Module } from '@nestjs/common';
import { LocohubBatchController } from './locohub-batch.controller';
import { LocohubBatchService } from './locohub-batch.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [LocohubBatchController],
  providers: [LocohubBatchService],
})
export class LocohubBatchModule {}
