import Conversation from "../models/conversationModel.js";
import ConvParticipant from "../models/convParticipantModel.js"
import Message from "../models/messageModel.js";
import MessageStatus from "../models/messageStatusModel.js";
import User from "../models/userModel.js";
import { messageStatus } from "../shareVariable.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { Op, Sequelize, where } from "sequelize";

export const createPrivateConversation = catchAsync(async (req, res, next) => {
    const { users } = req.body;

    const existUsers = await User.findAll({
        where: {
            id: { [Op.in]: [users[0], users[1]] }
        }
    });

    if (existUsers.length !== 2) {
        return next(new AppError('Users not found', 404));
    }

    let conversation = await ConvParticipant.findOne({
        attributes: [
            [Sequelize.col('conversationId'), 'id']
        ],
        where: {
            userId: { [Op.in]: [users[0], users[1]] }
        },
        group: ['conversationId'],
        having: Sequelize.where(Sequelize.fn('COUNT', Sequelize.col('userId')), 2)
    });

    if (!conversation) {
        conversation = await Conversation.create();

        for (let userId of users) {
            await ConvParticipant.create({
                userId,
                conversationId: conversation.id
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
                attributes: ['messageId', 'status'],
                where: {
                    messageId: message.id
                }
            });

            if (messagesStatus.status === messageStatus.Sent) {
                MessageStatus.update({
                    status: messageStatus.Seen
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
            const messagesStatus = await MessageStatus.findAll({
                attributes: ['messageId', 'status'],
                where: {
                    messageId: message.id
                }
            });

            return {
                ...message.toJSON(),
                statuses: messagesStatus
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

export const getConversations = catchAsync(async (req, res, next) => {
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