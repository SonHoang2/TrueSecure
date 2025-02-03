import Conversation from "../models/conversationModel.js"
import ConvParticipant from "../models/convParticipantModel.js"
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";

export const createPrivateConversation = catchAsync(async (req, res, next) => {
    const { users } = req.body;
    if (users.length !== 2) {
        return next(new AppError('Private conversation must have exactly 2 users', 400));
    }

    const conversation = await Conversation.create();

    for (let userId of users) {     
        await ConvParticipant.create({
            userId,
            conversationId: conversation.id
        });
    }
    res.status(201).json();
})

export const getConversationMessages = catchAsync(async (req, res, next) => {
    const conversationId = req.params.id;
    const conversation = await Conversation.findByPk(conversationId, {
        include: 'messages'
    });
    res.status(200).json(conversation);
})