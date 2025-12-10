import { registerEnumType } from '@nestjs/graphql';

export enum PropertyType {
	APARTMENT = 'APARTMENT',
	VILLA = 'VILLA',
	HOUSE = 'HOUSE',
	HOTEL = 'HOTEL',
}
registerEnumType(PropertyType, {
	name: 'PropertyType',
});

export enum PropertyStatus {
	ACTIVE = 'ACTIVE',
	SOLD = 'SOLD',
	DELETE = 'DELETE',
}
registerEnumType(PropertyStatus, {
	name: 'PropertyStatus',
});

export enum PropertyLocation {
	SEOUL = 'SEOUL',
	FRANCE = 'FRANCE',
	SPAIN = 'SPAIN',
	ITALY = 'ITALY',
	GERMANY = 'GERMANY',
	USA = 'USA',
	UK = 'UK',
	AUSTRALIA = 'AUSTRALIA',
}
registerEnumType(PropertyLocation, {
	name: 'PropertyLocation',
});
