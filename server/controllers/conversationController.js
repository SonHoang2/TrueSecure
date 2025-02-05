import Conversation from "../models/conversationModel.js";
import ConvParticipant from "../models/convParticipantModel.js"
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { Op, Sequelize } from "sequelize";

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
            },
            {
                model: Message,
                include: {
                    model: User,
                }
            }
        ]
    });

    if (!conversation) {
        return next(new AppError('Conversation not found', 404));
    }

    res.status(200).json(
        {
            status: 'success',
            data: {
                conversation
            }
        }
    );
})

export const getConversations = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const conversations = await ConvParticipant.findAll({
        where: {
            userId
        },
        include: {
            model: Conversation,
            include: {
                model: ConvParticipant,
                where: {
                    userId: { [Op.ne]: userId }
                }
            },
            include: {
                model: Message,
                limit: 1,
                order: [['createdAt', 'DESC']],
                include: {
                    model: User
                }
            }
        }
    });

    res.status(200).json({
        status: 'success',
        data: {
            conversations
        }
    });
})