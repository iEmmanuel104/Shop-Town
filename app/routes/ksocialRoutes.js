const express = require('express')
const router = express.Router()
const { basicAuth } = require('../middlewares/authWares')
const uploadFile = require('../middlewares/multerobject')

const {
    createPost,
    getPosts,
    getPost,
    updatePost,
    addPostActivity,
    deletePost,
} = require('../controllers/ksocial.controller')

router.route('/')
    .post(basicAuth, uploadFile.array('files'), createPost)
    .get(basicAuth, getPosts)

router.route('/:id')
    .get(basicAuth, getPost)
    .put(basicAuth, uploadFile.array('files'), updatePost)
    .delete(basicAuth, deletePost)

router.route('/activity/:id')
    .post(basicAuth, addPostActivity)

module.exports = router
