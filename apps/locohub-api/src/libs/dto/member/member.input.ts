import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import { MemberAuthType, MemberStatus, MemberType } from '../../enums/memeber.enum';
import { availableAgentSorts, availableMemberSorts, availablePropertySorts } from '../../config';
import { Direction } from '../../enums/common.enum';
import { PropertyStatus } from '../../enums/property.enum';

@InputType()
export class MemberInput {
	@IsNotEmpty()
	@Length(3, 12)
	@Field(() => String)
	memberNick: string;

	@IsNotEmpty()
	@Length(5, 12)
	@Field(() => String)
	memberPassword: string;

	@IsNotEmpty()
	@Field(() => String)
	memberPhone: string;

	@IsOptional()
	@Field(() => MemberType, { nullable: true })
	memberType?: MemberType;

	@IsOptional()
	@Field(() => MemberAuthType, { nullable: true })
	memberAuthType?: MemberAuthType;
}

@InputType()
export class LoginInput {
	@IsNotEmpty()
	@Length(3, 12)
	@Field(() => String)
	memberNick: string;

	@IsNotEmpty()
	@Length(5, 12)
	@Field(() => String)
	memberPassword: string;
}


@InputType()
class AISearch {
	@IsOptional()
	@Field(() => PropertyStatus, { nullable: true })
	propertyStatus?: PropertyStatus

	@IsOptional()
	@Field(() => String, { nullable: true })
	text?: string
}
@InputType()
export class AgentsInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number

	@IsOptional()
	@IsIn(availableAgentSorts)
	@Field(() => String, { nullable: true })
	sort?: string

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction

	@IsNotEmpty()
	@Field(() => AISearch)
	search: AISearch;
}

@InputType()
class MISearch {
	@IsOptional()
	@Field(() => MemberStatus, { nullable: true })
	memberStatus?: MemberStatus

	@IsOptional()
	@Field(() => MemberType, { nullable: true })
	memberType?: MemberType


	@IsOptional()
	@Field(() => String, { nullable: true })
	text?: string
}
@InputType()
export class MembersInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number

	@IsOptional()
	@IsIn(availableMemberSorts)
	@Field(() => String, { nullable: true })
	sort?: string

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction

	@IsNotEmpty()
	@Field(() => MISearch)
	search: MISearch;
}

@InputType()
class APIearch {
	@IsOptional()
	@Field(() => PropertyStatus, { nullable: true })
	propertyStatus?: PropertyStatus;
}

@InputType()
export class AgentPropertiesInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number

	@IsOptional()
	@IsIn(availablePropertySorts)
	@Field(() => String, { nullable: true })
	sort?: string

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction

	@IsNotEmpty()
	@Field(() => AISearch)
	search: AISearch
}