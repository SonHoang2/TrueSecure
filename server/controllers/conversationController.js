import Conversation from "../models/conversationModel";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";

export const createConversation = catchAsync(async (req, res) => {
    const { title, isGroup } = req.body;
    if (!title) {
        return next(new AppError('Title is required', 400));
    }
    const conversation = await Conversation.create({ title, isGroup });
    res.status(201).json(conversation);
})

export const getConversationMessages = catchAsync(async (req, res) => {
    const conversationId = req.params.id;
    const conversation = await Conversation.findByPk(conversationId, {
        include: 'messages'
    });
    res.status(200).json(conversation);
})