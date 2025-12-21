
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger: Logger = new Logger();

    public intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const recordTime = Date.now();
        const requestType = context.getType<GqlContextType>();

        if (requestType === 'http') {
            /* DEVELOP IF NEEDED! */
            return next.handle();
        } else if (requestType === 'graphql') {
            /* (1) PRINT REQUEST **/
            const gqlContext = GqlExecutionContext.create(context);
            const req = gqlContext.getContext().req;
            const requestBody = req?.body;
            
            // Log request details to identify empty queries
            if (requestBody) {
                const hasQuery = requestBody.query && requestBody.query.trim().length > 0;
                const operationName = requestBody.operationName || 'UNNAMED';
                const method = req?.method || 'UNKNOWN';
                const url = req?.url || 'UNKNOWN';
                const userAgent = req?.headers?.['user-agent'] || 'UNKNOWN';
                
                if (!hasQuery) {
                    this.logger.warn(`[EMPTY QUERY] Method: ${method}, URL: ${url}, Operation: ${operationName}, User-Agent: ${userAgent.substring(0, 50)}`);
                } else {
                    this.logger.log(`${this.stringify(requestBody)}`, 'Request');
                }
            } else {
                this.logger.warn(`[NO BODY] Request without body`);
            }

            /* (2) Error handling via QraphQL */
            /* (3) No Error, giving Response below */
            return next
                .handle()
                .pipe(
                    tap((context) => {
                        const responseTime = Date.now() - recordTime
                        this.logger.log(`${this.stringify(context)} - ${responseTime}ms \n\n`, 'RESPOSE');
                    }),
                );
        }

    }
    private stringify(context: ExecutionContext): string {
        return JSON.stringify(context).slice(0, 75);
    }
}
