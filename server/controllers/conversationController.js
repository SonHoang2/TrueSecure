import Conversation from "../models/conversationModel.js";
import ConvParticipant from "../models/convParticipantModel.js"
import Message from "../models/messageModel.js";
import MessageStatus from "../models/messageStatusModel.js";
import User from "../models/userModel.js";
import { MESSAGE_STATUS, ROLE_NAME } from "../shareVariable.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { Op, Sequelize } from "sequelize";

export const createConversation = catchAsync(async (req, res, next) => {
    const { users, avatar, title } = req.body;

    // add the current user to the list of users
    users.push(req.user.id);

    const existUsers = await User.findAll({
        where: {
            id: { [Op.in]: users }
        }
    });

    if (existUsers.length !== users.length) {
        return next(new AppError('Users not found', 404));
    }

    if (users.length < 2) {
        return next(new AppError('The minimum number of users in a conversation is 2', 400));
    }

    if (users.length > 25) {
        return next(new AppError('The maximum number of users in a group conversation is 25', 400));
    }

    if (users.length > 2 && !title) {
        return next(new AppError('Group chat must have a title', 400));
    }

    let conversation = await ConvParticipant.findOne({
        attributes: [
            [Sequelize.col('conversationId'), 'id'],
            [Sequelize.fn('COUNT', Sequelize.col('userId')), 'count']
        ],
        where: {
            userId: { [Op.in]: users }
        },
        group: ['conversationId'],
        having: Sequelize.where(Sequelize.fn('COUNT', Sequelize.col('userId')), users.length)
    });

    if (conversation) {
        let exactMatch = await ConvParticipant.count({
            where: {
                conversationId: conversation.id
            }
        });

        if (exactMatch !== users.length) {
            conversation = null;
        }
    }

    if (!conversation) {
        conversation = await Conversation.create({
            isGroup: users.length > 2,
            title: users.length > 2 ? req.body.title : null,
            avatar: users.length > 2 ? (avatar?.trim() || "group-avatar-default.png") : null
        });

        for (let userId of users) {
            let role = ROLE_NAME.MEMBER;

            if (userId === req.user.id && users.length > 2) {
                role = ROLE_NAME.ADMIN;
            }

            await ConvParticipant.create({
                userId,
                conversationId: conversation.id,
                role: role
            });
        }
    }

    res.status(201).json({
        status: 'success',
        data: {
            conversation
        }
    });
})

export const getConversationMessages = catchAsync(async (req, res, next) => {
    const conversationId = req.params.id;

    const conversation = await Conversation.findByPk(conversationId, {
        include: [
            {
                model: ConvParticipant,
                attributes: ['id', 'role', 'userId', 'conversationId'],
                include: {
                    model: User,
                    attributes: ['id', 'avatar', 'firstName', 'lastName']
                }
            },
            {
                model: Message,
            }
        ]
    });

    if (!conversation) {
        return next(new AppError('Conversation not found', 404));
    }

    const user = conversation.convParticipants.find(participant => participant.userId === req.user.id);

    if (!user) {
        return next(new AppError('You are not a participant of this conversation', 403));
    }

    let messages = [];

    if (!conversation.isGroup) {
        messages = await Promise.all(conversation.messages.map(async message => {
            const messagesStatus = await MessageStatus.findOne({
                attributes: ['status'],
                where: {
                    messageId: message.id
                }
            });

            if (messagesStatus.status === MESSAGE_STATUS.SENT) {
                await MessageStatus.update({
                    status: MESSAGE_STATUS.SEEN
                }, {
                    where: {
                        messageId: message.id,
                        userId: req.user.id
                    }
                });
            }

            return {
                ...message.toJSON(),
                status: messagesStatus.status
            }
        }));
    } else {
        messages = await Promise.all(conversation.messages.map(async message => {
            const messagesStatuses = await MessageStatus.findAll({
                attributes: ['status', 'userId'],
                where: {
                    messageId: message.id,
                }
            });

            await MessageStatus.update(
                { status: MESSAGE_STATUS.SEEN },
                {
                    where: {
                        messageId: message.id,
                        userId: req.user.id,
                        status: MESSAGE_STATUS.SENT
                    }
                }
            );

            return {
                ...message.toJSON(),
                statuses: messagesStatuses
            }
        }));
    }

    res.status(200).json(
        {
            status: 'success',
            data: {
                conversation: {
                    ...conversation.toJSON(),
                    messages
                }
            }
        }
    );
})

export const getUserConversations = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const conversations = await ConvParticipant.findAll({
        attributes: ['conversationId', 'role', 'userId'],
        where: {
            userId
        },
        include: [
            {
                model: Conversation,
                include: [
                    {
                        model: ConvParticipant,
                        attributes: ['id', 'role'],
                        where: {
                            userId: { [Op.ne]: userId }
                        },
                        include: {
                            model: User,
                            attributes: ['id', 'avatar', 'firstName', 'lastName']
                        }
                    },
                    {
                        model: Message,
                        attributes: ['id', 'content', 'createdAt', 'senderId', 'messageType'],
                        limit: 1,
                        order: [['createdAt', 'DESC']],
                        separate: true, 
                    }
                ]
            }
        ]
    });

    res.status(200).json({
        status: 'success',
        data: {
            conversations
        }
    });
})


export const createGroupKey = catchAsync(async (req, res, next) => {
    const { groupKey, userId, conversationId } = req.body;

    await ConvParticipant.update(
        { groupKey },
        {
            where: {
                userId,
                conversationId
            }
        }
    )

    res.status(201).json({
        status: 'success',
        data: {
            groupKey
        }
    });
})

export const getConversationKey = catchAsync(async (req, res, next) => {
    const { conversationId } = req.params;

    if (!conversationId) {
        return next(new AppError('Conversation ID is required', 400));
    }

    const userId = req.user.id;

    const conversation = await ConvParticipant.findOne({
        attributes: ['groupKey', 'id'],
        where: {
            userId,
            conversationId
        }
    });

    if (!conversation) {
        return next(new AppError('Conversation not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            groupKey: conversation.groupKey
        }
    });
})