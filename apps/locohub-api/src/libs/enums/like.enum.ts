import { registerEnumType } from '@nestjs/graphql';

export enum LikeGroup {
	MEMBER = 'MEMBER',
	PROPERTY = 'PROPERTY',
}
registerEnumType(LikeGroup, {
	name: 'LikeGroup',
});
