import type {Request, Response, NextFunction} from 'express';

import {Controller} from '../../controller.js';
import {BadRequest, Forbidden} from '../../../utils/errors.js';
import {ConversationService, conversationService} from './conversation.service.js';
import {
    ConversationAddDto,
    ConversationAddResponseDto, ConversationResponseDeleteDto,
    ConversationResponseDto, UserConversationResponseDto
} from "../../../types/conversations/conversations.dto.js";

class ConversationController extends Controller {

    constructor(private readonly service: ConversationService = conversationService) {
        super();
    }

    async add(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {

            const addData: ConversationAddDto = {
                user1_id: req.user!.id,
                user2_id: req.body.user2_id
            }

            if (!addData.user1_id) {
                throw new BadRequest('User_id1 is required');
            }

            if (!addData.user2_id) {
                throw new BadRequest('User_id2 is required');
            }

            const conversation: ConversationAddResponseDto = await this.service.create(
                addData
            );

            res.status(201).json({
                message: 'Conversation created successfully',
                conversation,
            });
        } catch (err) {
            next(err);
        }
    }

    async getAll(_: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const conversations: ConversationResponseDto[] = await this.service.getAll();
            res.status(201).json({
                message: 'All conversations retrieved successfully',
                conversations,
            });
        } catch (err) {
            next(err);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {

            if (!req.params.id) {
                throw new BadRequest('ID is required');
            }

            await this.service.requireParticipant(req.params.id, req.user!.id);
            const conversation: ConversationResponseDto = await this.service.getById(req.params.id);

            res.status(201).json({
                message: `Conversation retrieved successfully`,
                conversation,
            });
        } catch (err) {
            next(err);
        }
    }

    async getUserConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { userId } = req.params;
            if (userId !== req.user!.id) throw new Forbidden("Conversation access denied");

            if (!userId) {
                throw new BadRequest('User ID is required');
            }
            
            const conversations: UserConversationResponseDto[] = await this.service.getUserConversations(userId, typeof req.query.include === "string" ? req.query.include : undefined);

            res.status(200).json({
                message: 'User conversations retrieved successfully',
                conversations,
            });
        } catch (err) {
            next(err);
        }
    }

    async respond(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            res.json({conversation: await this.service.respond(req.params.id, req.user!.id, req.body.action)});
        } catch (err) { next(err); }
    }

    async update(_req: Request, _res: Response, _next: NextFunction): Promise<null> {
        // This function don't have to be used for this table
        return null
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {

            if (!req.params.id) {
                throw new BadRequest('ID is required');
            }

            const conversation: ConversationResponseDeleteDto = await this.service.delete(req.params.id);
            res.status(201).json({
                message: 'Conversation deleted successfully',
                conversation,
            });
        } catch (err) {
            next(err);
        }
    }
}

export default new ConversationController();
