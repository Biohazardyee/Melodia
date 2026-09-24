import type {Request, Response, NextFunction} from 'express';
import {BadRequest} from '../../../utils/errors.js';
import {FollowService, followService} from './follow.service.js';
import {FollowCreateDto, FollowResponseDto} from "../../../types/follows/follows.dto.js";

class FollowController {

    constructor(private readonly service: FollowService = followService) {
    }

    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {

            const creationData: FollowCreateDto = {
                user_id: req.user!.id,
                follow_user_id: req.body.follow_user_id
            }


            if (!creationData.user_id || !creationData.follow_user_id) {
                throw new BadRequest('user_id and follow_user_id are required');
            }

            const follow: FollowResponseDto = await this.service.create(creationData);

            res.status(201).json({
                message: 'User followed successfully',
                follow,
            });
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const unfollow: FollowResponseDto = await this.service.delete(
                req.user!.id,
                req.body.follow_user_id
            );

            res.status(200).json({
                message: 'User unfollowed successfully',
                data: unfollow,
            });
        } catch (error) {
            next(error);
        }
    }

    async getFollowers(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const followers: FollowResponseDto[] = await this.service.getFollowers(req.params.user_id);

            res.status(200).json({
                message: 'Followers retrieved successfully',
                data: followers,
            });
        } catch (error) {
            next(error);
        }
    }

    async getFollowing(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const following: FollowResponseDto[] = await this.service.getFollowing(req.params.user_id);

            res.status(200).json({
                message: 'Following retrieved successfully',
                data: following,
            });
        } catch (error) {
            next(error);
        }
    }

    async getFollowersWithUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const followers = await this.service.getFollowersWithUsers(req.params.user_id);

            res.status(200).json({
                message: 'Followers retrieved successfully',
                data: followers,
            });
        } catch (error) {
            next(error);
        }
    }

    async getFollowingWithUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const following = await this.service.getFollowingWithUsers(req.params.user_id);

            res.status(200).json({
                message: 'Following retrieved successfully',
                data: following,
            });
        } catch (error) {
            next(error);
        }
    }

    async getMutuals(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const mutuals = await this.service.getMutualFollows(req.params.user_id);

            res.status(200).json({
                message: 'Mutual follows retrieved successfully',
                data: mutuals,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new FollowController();
