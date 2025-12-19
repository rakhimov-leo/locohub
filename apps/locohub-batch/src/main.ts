import { NestFactory } from '@nestjs/core';
import { LocohubBatchModule } from './locohub-batch.module';

async function bootstrap() {
	const app = await NestFactory.create(LocohubBatchModule);
	await app.listen(process.env.SERVER_BATCH ?? 3000);
}
bootstrap();
