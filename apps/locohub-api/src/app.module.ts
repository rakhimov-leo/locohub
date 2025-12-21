import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { AppResolver } from './app.resolver';
import { ComponentsModule } from './components/components.module';
import { DatabaseModule } from './database/database.module';
import { T } from './libs/types/common';
import { SocketModule } from './socket/socket.module';

@Module({
	imports: [
		ConfigModule.forRoot(),
		GraphQLModule.forRoot({
			driver: ApolloDriver,
			// Apollo Server v4 uses Apollo Studio Explorer instead of Playground
			// Explorer is available at /graphql endpoint (GET request)
			playground: false, // Playground is deprecated in Apollo Server v4
			introspection: true, // Always enable GraphQL introspection for Explorer
			debug: true, // Enable debug mode
			uploads: false,
			autoSchemaFile: true,
			csrfPrevention: false, // Disable CSRF protection for GraphQL (handled by CORS)
			formatError: (error: T) => {
				const graphQLFormattedError = {
					code: error?.extensions.code,
					message: error?.extensions?.exception?.message || error?.extensions?.response?.message || error.message,
				};
				// Don't log empty query errors (common with GraphQL Playground GET requests)
				if (error?.message && !error.message.includes('must contain a non-empty `query`')) {
					console.log('GRAPHQL GLOBAL ERR:', graphQLFormattedError);
				}
				return graphQLFormattedError;
			},
		}),
		ComponentsModule,
		DatabaseModule,
		SocketModule,
	],
	controllers: [AppController],
	providers: [AppService, AppResolver],
})
export class AppModule {}
