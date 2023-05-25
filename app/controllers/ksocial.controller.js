const { Product, User, Brand, Ksocial, PostActivity } = require('../../models');
require('dotenv').config();
const { sequelize, Sequelize } = require('../../models');
const asyncWrapper = require('../middlewares/async');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { getPagination, getPagingData } = require('../utils/pagination')
const Op = require("sequelize").Op;
const { uploadSingleFile, uploadFiles } = require('../services/imageupload.service');
const CronJob = require('cron').CronJob;

// Controller for creating a post
const createPost = asyncWrapper(async (req, res, next) => {
    const { caption, post_type } = req.body;
    const decoded = req.decoded;
    const storeId = decoded.storeId;

    if (!storeId) {
        return next(new ForbiddenError('You are not authorized to create a post'));
    }

    let fileUrls = [];

    if (req.files) {
        console.log(req.files) 
        const details = {
            folder: 'ksocial',
            user: storeId,
        };

        console.log('files found for upload')

        fileUrls = await uploadFiles(req, details);
    }

    const post = await Ksocial.create({
        caption,
        posttype: post_type,
        contentUrl: fileUrls,
        brandId: storeId,
    });


    if (post.posttype === 'status') {
        // Schedule the post deletion
        const deletionJob = new CronJob('0 0 */24 * * *', async () => {
        // const deletionJob = new CronJob('0 */1 * * * *', async () => {
            try {
                // Delete the post and associated files
                await post.destroy();
                console.log(`Post with ID ${post.id} deleted.`);
            } catch (error) {
                console.error('Error deleting post:', error);
            }
        });

        deletionJob.start(); // Start the deletion job
        console.log(`Post with ID ${post.id} scheduled for deletion.`);
    }

    res.status(201).json({
        success: true,
        data: post,
    });
});

const getPosts = asyncWrapper(async (req, res, next) => {
    const { page, size } = req.query;
    const { limit, offset } = getPagination(page, size);

    const posts = await Ksocial.findAndCountAll({
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        attributes: [
            'id',
            'caption',
            'posttype',
            'contentUrl',
            'createdAt',

        ],
        include: [
            {
                model: Brand,
                attributes: ['id', 'name', 'logo'],
            },
            {
                model: PostActivity,
                as: 'postActivities',
                // attributes: [
                //     [sequelize.literal("SUM(CASE WHEN \"postActivities\".\"like\" = true THEN 1 ELSE 0 END)"), 'totalLikes'],
                //     [sequelize.fn('COUNT', sequelize.col('postActivities.comment')), 'totalComments'],
                // ],
            },
        ],
        // group: ['Ksocial.id', 'Brand.id'],
    });

    const response = getPagingData(posts, page, limit);

    res.status(200).json({
        success: true,
        data: response,
    });
});



const getPost = asyncWrapper(async (req, res, next) => {
    const post = await Ksocial.findByPk(req.params.id, {
        attributes: ['id', 'caption', 'posttype', 'contentUrl', 'createdAt'],
        include: [
            {
                model: Brand,
                attributes: ['id', 'name', 'logo'],
            },
            {
                model: PostActivity,
                attributes: ['id',
                    'userId', 'like', 'comment',
                    [sequelize.literal("SUM(CASE WHEN `PostActivity`.`like` = true THEN 1 ELSE 0 END)"), 'totalLikes'],
                    [sequelize.fn('COUNT', sequelize.col('PostActivity.comment')), 'totalComments']
                ],
                include: [
                    {
                        model: User,
                        attributes: ['id', 'fullName', 'profileImage'],
                    }
                ]
            }
        ]
    });

    if (!post) {
        return next(new NotFoundError(`Post with id ${req.params.id} not found`));
    }

    res.status(200).json({
        success: true,
        data: post,
    });
});

const updatePost = asyncWrapper(async (req, res, next) => {
    const { caption, posttype } = req.body;
    const decoded = req.decoded;
    const storeId = decoded.storeId;
    const files = req.files;
    let fileUrls = [];

    if (files) {
        const details = {
            folder: 'ksocial',
            user: storeId,
        };

        fileUrls = await uploadFiles(req, 'files', details);
    }

    const post = await Ksocial.findByPk(req.params.id);

    if (!post) {
        return next(new NotFoundError(`Post with id ${req.params.id} not found`));
    }

    if (post.brandId !== storeId) {
        return next(new ForbiddenError('You are not authorized to update this post'));
    }

    await post.update({
        caption: caption ? caption : post.caption,
        contentUrl: fileUrls.length > 0 ? fileUrls : post.contentUrl,
    });

    res.status(200).json({
        success: true,
        data: post,
    });
});

const addPostActivity = asyncWrapper(async (req, res, next) => {
    const { like, comment } = req.body;
    const decoded = req.decoded;
    const userId = decoded.id;

    const post = await Ksocial.findByPk(req.params.id);

    if (!post) {
        return next(new NotFoundError(`Post with id ${req.params.id} not found`));
    }

    const activity = await PostActivity.findOne({
        where: {
            KsocialId: req.params.id,
            userId,
        }
    });

    let message;

    if (!activity) {
        await PostActivity.create({
            ksocialId: req.params.id,
            userId,
            like: like ? like : false,
            comment: comment ? comment : null,
        });
        message = 'Post activity added successfully';
    } else {
        await activity.update({
            like: like ? like : activity.like,
            comment: comment ? comment : activity.comment,
        });
        message = 'Post activity updated successfully';
    }

    res.status(200).json({
        success: true,
        message: message,
    });
});




const deletePost = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded;
    const storeId = decoded.storeId;

    const post = await Ksocial.findByPk(req.params.id);

    if (!post) {
        return next(new NotFoundError(`Post not found`));
    }

    if (post.brandId !== storeId) {
        return next(new ForbiddenError('You are not authorized to delete this post'));
    }

    await post.destroy();

    res.status(200).json({
        success: true,
        message: 'Post deleted successfully',
        data: {},
    });
});



module.exports = {
    createPost,
    getPosts,
    getPost,
    updatePost,
    addPostActivity,
    deletePost,
};
