import express from 'express';
import docRoutes from '../docs';
import jobRoutes from './job.route';
import companyRoutes from './company.route';
import postRoutes from './post.route';
import feedRoutes from './feed.route';
import commentRoutes from './comment.route';
import relatedLinkRoutes from './relatedLink.route';
import voteRoutes from './vote.route';
import bookmarkRoutes from './bookmark.route';
import authRoutes from './auth.route';
import userRoutes from './user.route';
import subscriptionRoutes from './subscription.route';
import forumRoutes from './forum.route';
import listenedRoutes from './listened.route';
import tagsRoutes from './tag.route';
import topicsRoutes from './topics.route';
import topicRoutes from './topic.route';
import rssRoutes from './rss.route';
import profileRoutes from './profile.route';
import topicPageRoutes from './topicPage.route';
import questionRoutes from './question.route';
import answerRoutes from './answer.route';
import twitterRoutes from './twitter.route';
// import userRoutes from './user.route';

const router = express.Router(); // eslint-disable-line new-cap

/**
 * @swagger
 * tags:
 * - name: general
 *   description: General/server-related
 */

/**
 * @swagger
 * /health-check:
 *   get:
 *     summary: Health check of server
 *     description: Confirm SED API server running and okay
 *     tags: [general]
 *     responses:
 *       200:
 *         description: successful operation
 */

router.get('/health-check', (req, res) =>
  res.send('OK'));

router.use('/docs', docRoutes);
router.use('/related-links', relatedLinkRoutes);
router.use('/posts', postRoutes);
router.use('/forum', forumRoutes);
router.use('/jobs', jobRoutes);
router.use('/companies', companyRoutes);
router.use('/comments', commentRoutes);
router.use('/votes', voteRoutes);
router.use('/bookmarks', bookmarkRoutes);
router.use('/favorites', bookmarkRoutes);
router.use('/listened', listenedRoutes);
router.use('/tags', tagsRoutes);
router.use('/users', userRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/feed', feedRoutes);
router.use('/auth', authRoutes);
router.use('/topics', topicsRoutes);
router.use('/topic', topicRoutes);
router.use('/rss', rssRoutes);
router.use('/profile', profileRoutes);
router.use('/topicpage', topicPageRoutes);
router.use('/question', questionRoutes);
router.use('/answer', answerRoutes);
router.use('/twitter', twitterRoutes);

export default router;
