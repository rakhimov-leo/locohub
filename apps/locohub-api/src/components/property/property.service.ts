import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Properties, Property } from '../../libs/dto/property/property';
import { MemberService } from '../member/member.service';
import {
	AllPropertiesInquiry,
	OrdinaryInquiry,
	PropertiesInquiry,
	PropertyInput,
} from '../../libs/dto/property/property.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { StatisticModifier, T } from '../../libs/types/common';
import { PropertyStatus } from '../../libs/enums/property.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { ViewService } from '../view/view.service';
import { PropertyUpdate } from '../../libs/dto/property/property.update';
import * as moment from 'moment';
import { lookupAuthMemberLiked, lookupMember, shapeIntoMongoObjectId } from '../../libs/config';
import { AgentPropertiesInquiry } from '../../libs/dto/member/member.input';
import { LikeService } from '../like/like.service';
import { LikeInput } from '../../libs/dto/like/like.input';
import { LikeGroup } from '../../libs/enums/like.enum';

@Injectable()
export class PropertyService {
	private readonly logger = new Logger(PropertyService.name);

	constructor(
		@InjectModel('Property') private readonly propertyModel: Model<Property>,
		private memberService: MemberService,
		private viewService: ViewService,
		private likeService: LikeService,
	) {}

	public async createProperty(input: PropertyInput): Promise<Property> {
		try {
			const result = await this.propertyModel.create(input);
			await this.memberService.memberStatsEditor({
				_id: result.memberId,
				targetKey: 'memberProperties',
				modifier: 1,
			});
			return result;
		} catch (err) {
			this.logger.error(`Error creating property: ${err.message}`, err.stack);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getProperty(memberId: ObjectId, propertyId: ObjectId): Promise<Property> {
		this.logger.debug(`getProperty called: propertyId=${propertyId}, memberId=${memberId}`);
		
		// First, check if property exists at all
		const anyProperty = await this.propertyModel.findById(propertyId).lean().exec();
		if (!anyProperty) {
			this.logger.warn(`Property with ID ${propertyId} does not exist in database`);
			throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		}
		
		this.logger.debug(`Property found: status=${anyProperty.propertyStatus}, deletedAt=${anyProperty.deletedAt}`);
		
		// Check if property is active and not deleted
		if (anyProperty.propertyStatus !== PropertyStatus.ACTIVE) {
			this.logger.warn(`Property status is not ACTIVE: ${anyProperty.propertyStatus}`);
			throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		}
		
		if (anyProperty.deletedAt) {
			this.logger.warn(`Property is deleted: deletedAt=${anyProperty.deletedAt}`);
			throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		}
		
		// Property is valid, use it
		const targetProperty: Property = anyProperty;
		this.logger.debug(`Property found successfully: ${targetProperty._id}`);

		if (memberId) {
			const viewInput = {
				memberId: memberId,
				viewRefId: propertyId,
				viewGroup: ViewGroup.PROPERTY,
			};
			const newView = await this.viewService.recordView(viewInput);
			if (newView) {
				await this.propertyStatusEditor({
					_id: propertyId,
					targetKey: 'propertyViews',
					modifier: 1,
				});
				targetProperty.propertyViews++;
			}

			//meLike
			const likeInput = {
				memberId: memberId,
				likeRefId: propertyId,
				likeGroup: LikeGroup.PROPERTY,
			};
			targetProperty.meLiked = await this.likeService.checkLikeExistence(likeInput);
		}

		// Get member data - handle case where member might not exist
		try {
			this.logger.debug(`Getting member data for memberId: ${targetProperty.memberId}`);
			targetProperty.memberData = await this.memberService.getMember(null, targetProperty.memberId);
			this.logger.debug(`Member data retrieved successfully`);
		} catch (error) {
			this.logger.warn(`Failed to get member data for memberId: ${targetProperty.memberId}, error: ${error.message}`);
			// Don't throw error, just set memberData to null
			targetProperty.memberData = null;
		}
		
		return targetProperty;
	}

	public async propertyStatusEditor(input: StatisticModifier): Promise<Property> {
		const { _id, targetKey, modifier } = input;
		return await this.propertyModel
			.findByIdAndUpdate(
				_id,
				{ $inc: { [targetKey]: modifier } },
				{
					new: true,
				},
			)
			.exec();
	}

	public async updateProperty(memberId: ObjectId, input: PropertyUpdate): Promise<Property> {
		let { propertyStatus, soldAt, deletedAt } = input;
		const search: T = {
			_id: input._id,
			memberId: memberId,
			propertyStatus: PropertyStatus.ACTIVE,
		};

		if (propertyStatus === PropertyStatus.SOLD) soldAt = moment().toDate();
		else if (propertyStatus === PropertyStatus.DELETE) deletedAt = moment().toDate();

		const result = await this.propertyModel.findOneAndUpdate(search, input, { new: true }).exec();

		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (soldAt || deletedAt) {
			await this.memberService.memberStatsEditor({
				_id: memberId,
				targetKey: 'memberProperties',
				modifier: -1,
			});
		}
		return result;
	}

	public async getProperties(memberId: ObjectId, input: PropertiesInquiry): Promise<Properties> {
		const match: T = { 
			propertyStatus: PropertyStatus.ACTIVE,
			$or: [
				{ deletedAt: null },
				{ deletedAt: { $exists: false } },
			], // Only get non-deleted properties
		};
		const sort: T = {
			[input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC,
		};

		this.shapeMatchQuery(match, input);

		const result = await this.propertyModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupAuthMemberLiked(memberId),
							lookupMember,
							{ $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length || !result[0]) {
			return { list: [], metaCounter: [] };
		}

		return result[0];
	}

	private shapeMatchQuery(match: T, input: PropertiesInquiry): void {
		const { memberId, locationList, roomsList, adultsList, typeList, periodsRange, pricesRange, options, text } =
			input.search;
		if (memberId) match.memberId = shapeIntoMongoObjectId(memberId);
		if (locationList && locationList.length) match.propertyLocation = { $in: locationList };
		if (roomsList && roomsList.length) match.propertyRooms = { $in: roomsList };
		if (adultsList && adultsList.length) match.propertyBeds = { $in: adultsList };
		if (typeList && typeList.length) match.propertyType = { $in: typeList };

		if (pricesRange) match.propertyPrice = { $gte: pricesRange.start, $lte: pricesRange.end };
		if (periodsRange) match.createdAt = { $gte: periodsRange.start, $lte: periodsRange.end };

		if (text) match.propertyTitle = { $regex: new RegExp(text, 'i') };
		if (options) {
			match['$or'] = options.map((ele) => {
				return { [ele]: true };
			});
		}
	}

	public async getFavorites(memberId: ObjectId, input: OrdinaryInquiry): Promise<Properties> {
		return await this.likeService.getFavoriteProperties(memberId, input);
	}

	public async getVisited(memberId: ObjectId, input: OrdinaryInquiry): Promise<Properties> {
		return await this.viewService.getVisitedProperties(memberId, input);
	}

	public async getAgentProperties(memberId: ObjectId, input: AgentPropertiesInquiry): Promise<Properties> {
		const { propertyStatus } = input.search;
		if (propertyStatus === PropertyStatus.DELETE) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);

		const match: T = {
			memberId: memberId,
			propertyStatus: propertyStatus ?? { $ne: PropertyStatus.DELETE },
		};
		const sort: T = {
			[input?.sort ?? 'createdAt']: input.direction ?? Direction.DESC,
		};

		const result = await this.propertyModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupMember,
							{ $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length || !result[0]) {
			return { list: [], metaCounter: [] };
		}

		return result[0];
	}

	public async likeTargetProperty(memberId: ObjectId, likeRefId: ObjectId): Promise<Property> {
		const target: Property = await this.propertyModel
			.findOne({ _id: likeRefId, propertyStatus: PropertyStatus.ACTIVE })
			.exec();
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const input: LikeInput = {
			memberId: memberId,
			likeRefId: likeRefId,
			likeGroup: LikeGroup.PROPERTY,
		};

		const modifier: number = await this.likeService.toggleLike(input);
		const result = await this.propertyStatusEditor({
			_id: likeRefId,
			targetKey: 'propertyLikes',
			modifier: modifier,
		});

		if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
		return result;
	}

	public async getAllPropertiesByAdmin(input: AllPropertiesInquiry): Promise<Properties> {
		const { propertyStatus, propertyLocationList } = input.search;
		const match: T = {};
		const sort: T = {
			[input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC,
		};

		if (propertyStatus) match.propertyStatus = propertyStatus;
		if (propertyLocationList) match.propertyLocation = { $in: propertyLocationList };

		const result = await this.propertyModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupMember,
							{ $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		if (!result.length || !result[0]) {
			return { list: [], metaCounter: [] };
		}

		return result[0];
	}

	public async updatePropertyByAdmin(input: PropertyUpdate): Promise<Property> {
		let { propertyStatus, soldAt, deletedAt } = input;
		const search: T = {
			_id: input._id,
			propertyStatus: PropertyStatus.ACTIVE,
		};

		if (propertyStatus === PropertyStatus.SOLD) soldAt = moment().toDate();
		else if (propertyStatus === PropertyStatus.DELETE) deletedAt = moment().toDate();

		const result = await this.propertyModel.findOneAndUpdate(search, input, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (soldAt || deletedAt) {
			await this.memberService.memberStatsEditor({
				_id: result.memberId,
				targetKey: 'memberProperties',
				modifier: -1,
			});
		}

		return result;
	}

	public async removePropertyByAdmin(propertyId: ObjectId): Promise<Property> {
		const search: T = {
			_id: propertyId,
			propertyStatus: PropertyStatus.DELETE,
		};
		const result = await this.propertyModel.findOneAndDelete(search).exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);

		return result;
	}
}
