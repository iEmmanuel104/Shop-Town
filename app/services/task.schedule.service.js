const Bull = require('bull');
const client = require('../utils/redis');
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { REDIS_CONNECTION_URL } = require('../utils/configs');
const { Ksocial } = require('../../models');
const Redis = require('ioredis');
// const connection = new Redis(REDIS_CONNECTION_URL, {
//     maxRetriesPerRequest: null
// });

// Create a new connection in every instance
const postDeletionQueue = new Bull('postDeletionQueue', client);
postDeletionQueue.process(async (job) => {
    const { postId } = job.data;
    const post = await Ksocial.findByPk(postId);
    if (!post) {
        console.log(`Post with ID ${postId} not found.`);
        return;
    }
    console.log(`Deleting post with ID ${postId}...`);
    await post.destroy();

    console.log(`Post with ID ${postId} deleted.`);
});

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
    queues: [new BullAdapter(postDeletionQueue)],
    serverAdapter: serverAdapter,
});

module.exports = {
    postDeletionQueue,
    serverAdapter,
};
