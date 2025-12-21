import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './libs/interceptor/Logging.interceptor';
import { graphqlUploadExpress } from 'graphql-upload';
import * as express from 'express';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.useGlobalPipes(new ValidationPipe());
	app.useGlobalInterceptors(new LoggingInterceptor());
	
	// CORS configuration - allow only specific domains in production
	const allowedOrigins = process.env.NODE_ENV === 'production'
		? [
			'https://locohub.uz',
			'https://www.locohub.uz',
			'http://locohub.uz',
			'http://www.locohub.uz',
		]
		: true; // Allow all origins in development
	
	app.enableCors({ 
		origin: allowedOrigins,
		credentials: true 
	});

	app.use(graphqlUploadExpress({ maxFileSize: 15000000, maxFiles: 10 }));
	app.use('/uploads', express.static('./uploads'));

	app.useWebSocketAdapter(new WsAdapter(app));
	await app.listen(process.env.PORT_API ?? 3000);
}
bootstrap();
