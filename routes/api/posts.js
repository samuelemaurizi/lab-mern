const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');

const auth = require('../../middleware/auth');
const Post = require('../../models/Post');
const Profile = require('../../models/Profile');
const User = require('../../models/User');

// @route     POST api/posts
// @desc      Create a post
// @access    Private
router.post(
  '/',
  [
    auth,
    [
      check('text', 'Dude! You need to write something')
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select('-password');

      const newPost = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      };

      const post = await new Post(newPost);
      await post.save();
      res.json(post);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error: post a new post');
    }
  }
);

// @route     GET api/posts
// @desc      Get all posts
// @access    Private
router.get('/', auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).json('Server Error: get all posts');
  }
});

// @route     GET api/posts/:id
// @desc      Get one post
// @access    Private
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res
        .status(404)
        .json({ msg: 'Dude! I do not have the post your are looking for' });
    }

    res.json(post);
  } catch (err) {
    console.error(err.message);
    if (err.kind == 'ObjectId') {
      return res.status(400).json({
        msg:
          'Dude! I do not have the post your are looking for or the id is incorrect'
      });
    }
    res.status(500).send('Server Error: get one post');
  }
});

// @route     DELETE api/posts/:id
// @desc      Delete one post
// @access    Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(400).json({
        msg: 'Dude! I do not have the post you try to delete'
      });
    }

    // Check the user
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'You are not authorized!' });
    }

    await post.remove();

    res.json({ msg: 'Post removed :(' });
  } catch (err) {
    console.error(err.message);
    if (err.kind == 'ObjectId') {
      return res.status(400).json({
        msg:
          'Dude! I do not have the post you try to delete or the id is incorrect'
      });
    }
    res.status(500).send('Server Error: delete one post');
  }
});

// @route     PUT api/posts/like/:id
// @desc      Like a post
// @access    Private
router.put('/like/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    // Check if the post has already been liked from the current user
    if (
      post.likes.filter(like => like.user.toString() === req.user.id).length > 0
    ) {
      return res.status(400).json({ msg: 'Post already liked!' });
    }

    post.likes.unshift({ user: req.user.id });
    await post.save();
    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error: like a post');
  }
});

// @route     PUT api/posts/unlike/:id
// @desc      Unlike a post
// @access    Private
router.put('/unlike/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    // Check if the post is already been liked from the current user
    if (
      post.likes.filter(like => like.user.toString() === req.user.id).length ===
      0
    ) {
      return res.status(400).json({ msg: 'Post has not yet been liked' });
    }

    // Get the index
    const removeIndex = post.likes
      .map(like => like.user.toString())
      .indexOf(req.user.id);

    post.likes.splice(removeIndex, 1);
    await post.save();
    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error: unlike a post');
  }
});

// @route     POST api/posts/comment/:id
// @desc      Comment on a post
// @access    Private
router.post(
  '/comment/:id',
  [
    auth,
    [
      check('text', 'Dude! You need to write some text for the comment')
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select('-password');
      const post = await Post.findById(req.params.id);

      const newComment = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      };

      post.comments.unshift(newComment);

      await post.save();
      res.json(post.commets);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error: comment a post');
    }
  }
);

// @route     DELETE api/posts/comment/:id/:comment_id
// @desc      Delete comment
// @access    Private
router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    // Pull out the comment
    const comment = post.comments.find(
      comment => comment.id === req.params.comment_id
    );

    // Check if the comment exists
    if (!comment) {
      return res.status(400).json({
        msg: 'Dude! I do not have the comment you try to delete'
      });
    }

    // Check the user
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'You are not authorized!' });
    }

    // Get the index
    const removeIndex = post.comments
      .map(comment => comment.user.toString())
      .indexOf(req.user.id);

    post.comments.splice(removeIndex, 1);
    await post.save();
    res.json(post.comments);
  } catch (err) {
    console.error(err.message);
    if (err.kind == 'ObjectId') {
      return res.status(400).json({
        msg:
          'Dude! I do not have the post you try to delete or the id is incorrect'
      });
    }
    res.status(500).send('Server Error: delete one post');
  }
});

module.exports = router;
