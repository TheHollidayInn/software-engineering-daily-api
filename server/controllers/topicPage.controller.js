import httpStatus from 'http-status';
import Topic from '../models/topic.model';
import TopicPage from '../models/topicPage.model';
import RelatedLink from '../models/relatedLink.model';
import { signS3 } from '../helpers/s3';
import config from '../../config/config';

function checkMaintainer(req, topic) {
  if (!topic.maintainer || !topic.maintainer._id) return false;
  if (!req.user || !req.user._id) return false;
  if (req.user._id.toString() !== topic.maintainer._id.toString()) return false;
  return true;
}

async function get(req, res) {
  const topic = await Topic.findOne({ slug: req.params.slug })
    .populate('maintainer', 'name avatarUrl isAdmin');

  if (!topic) return res.status(404).send(`Topic ${req.params.slug} not found`);

  let topicPage = await TopicPage.findOne({ topic: topic._id })
    .populate('history.user', 'name avatarUrl isAdmin');

  let status = 200;

  if (!topicPage) {
    topicPage = new TopicPage({
      topic: topic._id,
      content: 'This is a initial template...'
    });
    await topicPage.save();
    topic.topicPage = topicPage._id;
    await topic.save();
    status = 201;
  }
  return res.status(status).send({ topic, topicPage });
}

async function update(req, res) {
  const topic = await Topic.findOne({ slug: req.params.slug })
    .populate('maintainer', 'name email avatarUrl isAdmin');

  if (!topic) return res.status(404).send(`Topic ${req.params.slug} not found`);

  const topicPage = await TopicPage.findOne({ topic: topic._id });

  if (!topicPage) return res.status(404).send(`Topic Page ${req.params.slug} not found`);

  if (!checkMaintainer(req, topic)) return res.status(403).send('Not authorized');

  topicPage.history = topicPage.history.concat(new TopicPage.History({
    user: req.user._id,
    event: req.body.event
  }));

  if (req.body.content) topicPage.content = req.body.content;
  if (req.body.logo) topicPage.logo = req.body.logo;
  topicPage.published = req.body.published || false;

  topic.topicPage = topicPage._id;

  try {
    await topic.save();
    await topicPage.save();
    return res.status(200).send('Saved');
  } catch (e) {
    return res.status(404).send(`Error saving: ${e.message || e}`);
  }
}

async function publish(req, res) {
  req.body.event = 'publish';
  req.body.published = true;

  update(req, res);
}

async function unpublish(req, res) {
  req.body.event = 'unpublish';
  req.body.published = false;

  update(req, res);
}

async function showContent(req, res) {
  const topic = await Topic.findOne({ slug: req.params.slug })
    .populate('maintainer', 'name avatarUrl');

  if (!topic) return res.status(404).send(`Topic ${req.params.slug} not found`);

  const topicPage = await TopicPage.findOne({ topic: topic._id });

  if (!topicPage) return res.status(404).send(`Topic ${req.params.slug} not found`);
  return res.status(200).json({ topic, topicPage });
}

async function relatedLinks(req, res) {
  const { slug } = req.params;
  const topic = await Topic.findOne({ slug });
  const topicPage = await TopicPage.findOne({ topic: topic._id });

  RelatedLink.list({ topicPage: topicPage._id, user: req.user })
    .then((links) => {
      res.json(links);
    });
}

async function getImages(req, res) {
  const { slug } = req.params;
  const topic = await Topic.findOne({ slug });
  const topicPage = await TopicPage.findOne({ topic: topic._id })
    .lean()
    .exec();
  const images = topicPage.images.filter(img => !img.deleted);
  res.json(images);
}

async function signS3ImageUpload(req, res) {
  const { fileType } = req.body;
  const randomNumberString = `${Math.random()}`;
  const newFileName = `topic_images/${randomNumberString.replace('.', '_')}`;

  const cbSuccess = (result) => {
    createImage(req, res, result);
  };

  // eslint-disable-next-line
  const cbError = err => {
    if (err) {
      console.log(err); // eslint-disable-line      
      return res.status(httpStatus.SERVICE_UNAVAILABLE).send('There was a problem getting a signed url');
    }
  };
  signS3(config.aws.topicBucketName, fileType, newFileName, cbSuccess, cbError);
}

async function createImage(req, res, result) {
  const { slug } = req.params;
  const topic = await Topic.findOne({ slug });
  const image = new TopicPage.Image({
    user: req.user._id,
    url: result.url,
  });

  await TopicPage.update({ topic: topic._id }, {
    $push: {
      images: { $each: [image], $position: 0 }
    }
  });

  res.write(JSON.stringify(result));
  res.end();
}

async function deleteImage(req, res) {
  const { slug, imageId } = req.params;
  const topic = await Topic.findOne({ slug });
  const topicPage = await TopicPage.findOne({ topic: topic._id });

  const image = topicPage.images.find(img => img._id.toString() === imageId.toString());

  if (!image) return res.status(404).send('Image not found');

  image.deleted = true;

  await topicPage.save();

  return res.send('Deleted');
}

export default {
  get,
  update,
  publish,
  unpublish,
  showContent,
  relatedLinks,
  getImages,
  signS3ImageUpload,
  deleteImage
};
