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
	// For Docker development, always allow localhost origins
	const isProduction = process.env.NODE_ENV === 'production';
	const allowedOrigins = isProduction
		? [
			'https://locohub.uz',
			'https://www.locohub.uz',
			'http://locohub.uz',
			'http://www.locohub.uz',
			// Allow localhost in production for Docker development/testing
			'http://localhost:4000',
			'http://localhost:3000',
			'http://127.0.0.1:4000',
			'http://127.0.0.1:3000',
		]
		: [
			'http://localhost:4000',
			'http://localhost:3000',
			'http://127.0.0.1:4000',
			'http://127.0.0.1:3000',
		];
	
	console.log(`[CORS] NODE_ENV: ${process.env.NODE_ENV}, isProduction: ${isProduction}`);
	console.log(`[CORS] Allowed origins:`, allowedOrigins);
	
	app.enableCors({ 
		origin: allowedOrigins,
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
		allowedHeaders: ['Content-Type', 'Authorization', 'x-apollo-operation-name', 'apollo-require-preflight'],
		exposedHeaders: ['Content-Type', 'Authorization'],
		optionsSuccessStatus: 200,
	});

	app.use(graphqlUploadExpress({ maxFileSize: 15000000, maxFiles: 10 }));
	app.use('/uploads', express.static('./uploads'));

	app.useWebSocketAdapter(new WsAdapter(app));
	await app.listen(process.env.PORT_API ?? 3000);
}
bootstrap();
