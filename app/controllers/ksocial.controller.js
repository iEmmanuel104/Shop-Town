const { Product, User, Brand, Ksocial, PostActivity } = require('../../models');
require('dotenv').config();
const { sequelize, Sequelize } = require('../../models');
const asyncWrapper = require('../middlewares/async');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { getPagination, getPagingData } = require('../utils/pagination')
const Op = require("sequelize").Op;
const { uploadSingleFile, uploadFiles } = require('../services/imageupload.service');
// const CronJob = require('cron').CronJob;
const { postDeletionQueue } = require('../services/task.schedule.service');

// Controller for creating a post
const createPost = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const { caption, post_type } = req.body;
        // const decoded = req.decoded;
        // const storeId = decoded.storeId;

        const { storeId } = req.query;

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
            storeId: storeId,
        }, { transaction: t });

        console.log(post.id)


        if (post.posttype === 'status') {
            // Schedule the post deletion
            const deletionJob = postDeletionQueue.add(
                { postId: post.id },
                {
                    // delay: 1000 * 60 * 60 * 24 , // 1 day
                    // 1 minute
                    delay: 1000 * 60 * 1,
                    removeOnComplete: true,
                    // removeOnFail: true,
                }
            );
            // deletionJob.start(); // Start the deletion job
            console.log(`Post with ID ${post.id} scheduled for deletion.`);
        }

        res.status(201).json({
            success: true,
            data: post,
        });
    });
});

const getPosts = asyncWrapper(async (req, res, next) => {
    const { page, size, status } = req.query;
    // const { limit, offset } = getPagination(page, size);

    const posts = await Ksocial.findAndCountAll({
        // limit,
        // offset,
        order: [['createdAt', 'DESC']],
        // where: { posttype:  status ? status : 'ksocial' }, 
        attributes: [
            'id',
            'caption',
            'posttype',
            'contentUrl',
            'createdAt',
            'likesCount',
            'commentsCount',
        ],
        include: [
            {
                model: Brand,
                attributes: ['id', 'name', 'logo', 'socials'],
            },
            // {
            //     model: PostActivity,
            //     as: 'postActivities',
            // },
        ],
    });

    // delete posts.rows.postActivities;

    // const response = getPagingData(posts, page, limit, 'posts');

    res.status(200).json({
        success: true,
        data: posts,
    });
});

const getuserpost = asyncWrapper(async (req, res, next) => {
    // const decoded = req.decoded;
    // const storeId = decoded.storeId;

    const { storeId } = req.query;

    if (!storeId) {
        return next(new ForbiddenError('You are not authorized to create a post'));
    }

    const posts = await Ksocial.findAll({
        order: [['createdAt', 'DESC']],
        where: { storeId: storeId },
        attributes: [
            'id',
            'caption',
            'posttype',
            'contentUrl',
            'createdAt',
            'likesCount',
            'commentsCount',
        ],
        include: [
            {
                model: Brand,
                attributes: ['id', 'name', 'logo', 'socials'],
            },
            // {
            //     model: PostActivity,
            //     as: 'postActivities',
            // },
        ],
    });
})



const getPost = asyncWrapper(async (req, res, next) => {
    const post = await Ksocial.findByPk(req.params.id, {
        attributes: ['id', 'caption', 'posttype', 'contentUrl', 'createdAt', 'likesCount', 'commentsCount'],
        include: [
            {
                model: Brand,
                attributes: ['id', 'name', 'logo'],
            },
            {
                model: PostActivity,
                as: 'postActivities',
                attributes: ['id', 'userId', 'like', 'comment', 'createdAt', 'updatedAt'],
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
    // const decoded = req.decoded;
    // const storeId = decoded.storeId;

    const { storeId } = req.query;
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

    if (post.storeId !== storeId) {
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
    newlike = like ? 'true' : 'false';
    if (!activity) {
        await PostActivity.create({
            KsocialId: req.params.id,
            userId,
            like: newlike,
            comment: comment ? comment : null,
        });
        message = 'Post activity added successfully';
    } else {
        await activity.update({
            like: newlike,
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
    // const decoded = req.decoded;
    // const storeId = decoded.storeId;

    const { storeId } = req.query;

    const post = await Ksocial.findByPk(req.params.id);

    if (!post) {
        return next(new NotFoundError(`Post not found`));
    }

    if (post.storeId !== storeId) {
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
