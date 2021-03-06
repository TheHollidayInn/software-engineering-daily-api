import isObject from 'lodash/isObject';
import isString from 'lodash/isString';
import Answer from '../models/answer.model';
import Question from '../models/question.model';
import Topic from '../models/topic.model';
import { saveAndNotifyUser } from './notification.controller';
import { mailTemplate } from '../helpers/mail';
import { indexTopic } from './topicPage.controller';

async function list(req, res, next) {
  req.posts = [];

  const isProduction = (process.env.NODE_ENV === 'production');
  const isMobile = (
    !req.headers.origin ||
    (isString(req.headers.origin) && req.headers.origin.indexOf('softwaredaily.com') < 0)
  );

  if (isProduction && isMobile) {
    return next();
  }

  const options = {
    $or: [
      { deleted: false },
      { deleted: { $exists: false } },
    ]
  };

  if (req.query.createdAfter) {
    options.dateCreated = { $gt: req.query.createdAfter };
  } else if (req.query.createdAtBefore) {
    options.dateCreated = { $lte: req.query.createdAtBefore };
  }

  try {
    req.posts = await Answer
      .find(options)
      .populate([
        'question',
        'author',
      ]);

    req.posts = req.posts
      .map((post) => {
        const answer = post.toObject();

        answer.type = 'answer';
        answer.date = answer.dateCreated;

        if (isObject(answer.question)) {
          answer[`${answer.question.entityType}s`] = [answer.question.entityId];
        }

        return answer;
      });
  } catch (err) {
    return next(err);
  }

  return next();
}

async function get(req, res) {
  const answer = await Answer.findById(req.params.id);

  if (!answer) return res.status(404).send('Not found');

  return res.json(answer.toObject());
}

async function create(req, res) {
  const { question: questionId, content } = req.body;

  if (!questionId || !content) return res.status(400).send('Missing data');

  const question = await Question
    .findById(questionId)
    .populate('author');

  const topic = await Topic
    .findOne({ _id: question.entityId });

  if (!question) return res.status(404).send('Question not found');

  if (!req.user) return res.status(401).send('Need to be logged');

  const answer = new Answer({
    question: question._id,
    content,
    author: req.user._id
  });

  try {
    const saved = await answer.save();

    question.answers = question.answers.concat([saved._id]);
    await question.save();

    if (question && question.entityId) {
      indexTopic(question.entityId);
    }

    const canSend = !!(
      question.author &&
      req.user &&
      question.author.email &&
      question.author.email !== req.user.email
    );

    const questionUrl = `/topic/${topic.slug}/question/${question._id}`;
    const payload = {
      notification: {
        title: 'Someone answered your question',
        body: saved.content,
        data: {
          user: req.user.username,
          mentioned: question.author._id,
          slug: topic.slug,
          url: questionUrl,
        }
      },
      type: 'question',
      entity: topic._id
    };

    if (canSend) {
      // notify maintainer
      saveAndNotifyUser(payload, question.author._id);

      // email maintainer
      mailTemplate.topicAnswer({
        to: question.author.email,
        subject: 'Someone answered your question',
        data: {
          user: question.author.name || '',
          topic: topic.name,
          actionLabel: 'View answer',
          actionLink: `http://softwaredaily.com${questionUrl}`,
          question: question.content || '',
        }
      });
    }

    return res.json(saved.toObject());
  } catch (e) {
    return res.status(500).end(e.message ? e.message : e.toString());
  }
}

async function update(req, res) {
  if (!req.body.content) return res.status(400).send('Missing data');

  const answer = await Answer
    .findById(req.params.id)
    .populate('question');

  if (!answer) return res.status(404).send('Not found');

  if (!req.user) return res.status(401).send('Need to be logged');

  if (answer.author.toString() !== req.user._id.toString()) {
    return res.status(401).send('You are not the author of this answer');
  }

  answer.content = req.body.content.trim();
  answer.dateUpdated = new Date();

  try {
    const saved = await answer.save();

    if (answer.question && answer.question.entityId) {
      indexTopic(answer.question.entityId);
    }

    return res.json(saved.toObject());
  } catch (e) {
    return res.status(500).end(e.message ? e.message : e.toString());
  }
}

async function deleteAnswer(req, res) {
  const answer = await Answer.findById(req.params.id);

  if (!answer) return res.status(404).send('Not found');

  answer.deleted = true;
  answer.dateUpdated = new Date();

  try {
    const saved = await answer.save();
    return res.json(saved.toObject());
  } catch (e) {
    return res.status(500).end(e.message ? e.message : e.toString());
  }
}

async function vote(req, res) {
  const answer = await Answer.findById(req.params.id);

  if (!answer) return res.status(404).send('Not found');

  if (!req.user) return res.status(401).send('Need to be logged');

  if (answer.author.toString() === req.user._id.toString()) {
    return res.status(401).send('Can\'t vote on own answer');
  }

  const ownVoted = answer.votes.find(v => v.toString() === req.user._id.toString());

  if (ownVoted) {
    answer.votes = answer.votes.filter(v => v.toString() !== req.user._id.toString());
  } else {
    answer.votes = answer.votes.concat([req.user._id]);
  }

  try {
    const saved = await answer.save();
    return res.json(saved.toObject());
  } catch (e) {
    return res.status(500).end(e.message ? e.message : e.toString());
  }
}

export default {
  list,
  get,
  create,
  update,
  delete: deleteAnswer,
  vote
};
