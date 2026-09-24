import {PrismaDb} from "../../../config/database.js";
import {BadRequest, NotFound} from "../../../utils/errors.js";
import {isEmptyString} from "../../../utils/helpers.js";
import {
    FollowCreateDto,
    FollowResponseDto,
    FollowUserPreviewDto,
} from "../../../types/follows/follows.dto.js";
import {followsMapper} from "../../../mappers/follows/follows.mapper.js";
import {Follows, Users} from "../../../generated/prisma/client.js";
import {bufferToImageDataUri} from "../../../utils/imageDataUri.js";
import {notificationService} from "../notifications/notification.service.js";
import {NotificationActions} from "../../../generated/prisma/enums.js";
import {canSendNotification} from "../notifications/notification.helper.js";
import {badgeService} from "../badges/badge.service.js";

const USER_PREVIEW_SELECT = {
    id: true,
    username: true,
    pseudo: true,
    profile_picture: true,
    equipped_avatar_border: true,
    equipped_font: true,
    equipped_text_effect: true,
} as const;

const toUserPreview = (user: {
    id: string;
    username: string;
    pseudo: string;
    profile_picture: Uint8Array | null;
    equipped_avatar_border: string | null;
    equipped_font: string | null;
    equipped_text_effect: string | null;
}): FollowUserPreviewDto => ({
    id: user.id,
    username: user.username,
    pseudo: user.pseudo,
    profile_picture: bufferToImageDataUri(user.profile_picture),
    equipped_avatar_border: user.equipped_avatar_border,
    equipped_font: user.equipped_font,
    equipped_text_effect: user.equipped_text_effect,
});

export class FollowService {
    async create(data: FollowCreateDto): Promise<FollowResponseDto> {
        if (isEmptyString(data.user_id) || isEmptyString(data.follow_user_id)) {
            throw new BadRequest("user_id and follow_user_id cannot be empty");
        }

        if (data.user_id === data.follow_user_id) {
            throw new BadRequest("You cannot follow yourself");
        }

        const [user, target] = await Promise.all([
            PrismaDb.users.findUnique({where: {id: data.user_id}}),
            PrismaDb.users.findUnique({where: {id: data.follow_user_id}}),
        ]);

        if (!user || !target) {
            throw new BadRequest("User or Target not found");
        }

        const exists = await PrismaDb.follows.findUnique({
            where: {
                user_id_follow_user_id: {
                    user_id: data.user_id,
                    follow_user_id: data.follow_user_id,
                },
            },
        });

        if (exists) {
            throw new BadRequest("Already following this user");
        }

        const result = await PrismaDb.$transaction(async (tx): Promise<FollowResponseDto> => {
            const followCreation = await tx.follows.create({
                data: {
                    user_id: data.user_id,
                    follow_user_id: data.follow_user_id,
                },
            });


            const isAllowed: boolean = await canSendNotification(
                data.follow_user_id,
                data.user_id,
                "new_follow",
                10,
            );

            if (isAllowed) {
                notificationService
                    .create({
                        user_id: data.follow_user_id,
                        action: NotificationActions.new_follow,
                        related_user_id: data.user_id,
                    })
                    .catch((err): void =>
                        console.error("Failed to process follow notification:", err),
                    );
            }

            return followsMapper.toDto(followCreation);
        });

        badgeService
            .checkAndAwardBadges(data.user_id)
            .catch((err): void => console.error("Badge check failed:", err));
        badgeService
            .checkAndAwardBadges(data.follow_user_id)
            .catch((err): void => console.error("Badge check failed:", err));

        return result;
    }

    async delete(
        user_id: string,
        follow_user_id: string,
    ): Promise<FollowResponseDto> {
        if (isEmptyString(user_id) || isEmptyString(follow_user_id)) {
            throw new BadRequest("user_id and follow_user_id cannot be empty");
        }

        const following = await PrismaDb.follows.findUnique({
            where: {
                user_id_follow_user_id: {
                    user_id: user_id,
                    follow_user_id: follow_user_id,
                },
            },
        });

        if (!following) {
            throw new BadRequest("User isnt following the target user");
        }

        return await PrismaDb.$transaction(async (tx): Promise<FollowResponseDto> => {
            const followToDelete = await tx.follows.delete({
                where: {
                    user_id_follow_user_id: {
                        user_id: user_id,
                        follow_user_id: follow_user_id,
                    },
                },
            });


            return followsMapper.toDto(followToDelete);
        });
    }

    async getFollowers(user_id: string): Promise<FollowResponseDto[]> {
        if (isEmptyString(user_id)) {
            throw new BadRequest("user_id cannot be empty");
        }

        const user: Users | null = await PrismaDb.users.findUnique({
            where: {
                id: user_id,
            },
        });

        if (!user) {
            throw new NotFound("User not found");
        }

        const followers: Follows[] = await PrismaDb.follows.findMany({
            where: {
                follow_user_id: user_id,
            },
            orderBy: {
                created_at: "desc",
            },
        });

        return followsMapper.toDtoList(followers);
    }

    /**
     * Renvoie les utilisateurs avec qui une conversation est possible :
     * ceux que l'utilisateur suit ET qui le suivent en retour (follow mutuel).
     */
    async getMutualFollows(user_id: string): Promise<
        {
            id: string;
            username: string;
            pseudo: string;
            profile_picture: string | null;
        }[]
    > {
        if (isEmptyString(user_id)) {
            throw new BadRequest("user_id cannot be empty");
        }

        const following = await PrismaDb.follows.findMany({
            where: {user_id},
            select: {follow_user_id: true},
        });

        const followingIds: string[] = following.map(
            (f): string => f.follow_user_id,
        );

        if (followingIds.length === 0) return [];

        // Parmi les personnes que je suis, celles qui me suivent aussi
        const mutuals = await PrismaDb.follows.findMany({
            where: {
                user_id: {in: followingIds},
                follow_user_id: user_id,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        pseudo: true,
                        profile_picture: true,
                    },
                },
            },
        });

        return mutuals.map((m) => ({
            id: m.user.id,
            username: m.user.username,
            pseudo: m.user.pseudo,
            profile_picture: bufferToImageDataUri(m.user.profile_picture),
        }));
    }

    async getFollowersWithUsers(user_id: string): Promise<FollowUserPreviewDto[]> {
        if (isEmptyString(user_id)) {
            throw new BadRequest("user_id cannot be empty");
        }

        const followers = await PrismaDb.follows.findMany({
            where: {follow_user_id: user_id},
            orderBy: {created_at: "desc"},
            include: {user: {select: USER_PREVIEW_SELECT}},
        });

        return followers.map((f) => toUserPreview(f.user));
    }

    async getFollowingWithUsers(user_id: string): Promise<FollowUserPreviewDto[]> {
        if (isEmptyString(user_id)) {
            throw new BadRequest("user_id cannot be empty");
        }

        const following = await PrismaDb.follows.findMany({
            where: {user_id},
            orderBy: {created_at: "desc"},
            include: {follow_user: {select: USER_PREVIEW_SELECT}},
        });

        return following.map((f) => toUserPreview(f.follow_user));
    }

    async getFollowing(user_id: string): Promise<FollowResponseDto[]> {
        if (isEmptyString(user_id)) {
            throw new BadRequest("user_id cannot be empty");
        }

        const user: Users | null = await PrismaDb.users.findUnique({
            where: {
                id: user_id,
            },
        });

        if (!user) {
            throw new NotFound("User not found");
        }

        const following: Follows[] = await PrismaDb.follows.findMany({
            where: {
                user_id,
            },
            orderBy: {
                created_at: "desc",
            },
        });

        return followsMapper.toDtoList(following);
    }
}

export const followService = new FollowService();
