import axios from 'axios';
import { toXML } from 'jstoxml';
import xml2js from 'xml2js';
import { cloneDeep } from 'lodash';
import moment from 'moment';
import config from '../../config/config';
import CronItem from '../helpers/cronItem.helper';
import app from '../../config/express';
import Post from '../models/post.model';

const PRIVATE_RSS_URL = 'https://feeds.megaphone.fm/SED2675996583';

async function getPrivateFeed() {
  const builder = new xml2js.Builder({ cdata: true });
  const parser = new xml2js.Parser({ explicitArray: false });
  let parsedResult = {};
  try {
    const feedResult = await axios.get(PRIVATE_RSS_URL);
    if (feedResult.status === 200) {
      parser.parseString(feedResult.data, (err, result) => {
        if (err) {
          throw err;
        }
        parsedResult = result;
      });
    }
  } catch (error) {
    console.log(error);// eslint-disable-line
  }
  return builder.buildObject(parsedResult);
}

const itunesImage = toXML({
  _name: 'itunes:image',
  _attrs: {
    href: 'https://www.softwaredaily.com/static/sedailywords.png'
  }
});

const itunesCategory = toXML({
  _name: 'itunes:category',
  _attrs: {
    text: 'News'
  },
  _content: {
    _name: 'itunes:category',
    _attrs: {
      text: 'Tech News'
    },
  }
});

// RSS header
const rawFeedConfig = {
  _name: 'rss',
  _attrs: {
    version: '2.0',
    'xmlns:itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd',
    'xmlns:content': 'http://purl.org/rss/1.0/modules/content/'
  },
  _content: {
    channel: [
      { title: 'Software Daily' },
      { link: 'https://www.softwaredaily.com' },
      { language: 'en-us' },
      { copyright: '&#169; SoftwareDaily.com' },
      { lastBuildDate: () => new Date() },
      { 'itunes:author': 'SoftwareDaily.com' },
      { description: 'Technical interviews about software topics.' },
      { 'itunes:type': 'serial' },
      { 'itunes:summary': 'Technical interviews about software topics.' },
      { 'itunes:explicit': 'no' },
      {
        'itunes:owner': {
          'itunes:name': 'Software Daily',
          'itunes:email': 'jeff@softwareengineeringdaily.com',
        }
      },
      itunesImage,
      itunesCategory,
    ]
  }
};

function decode(text) {
  return (text || '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, '') // Corrention
    .replace(/amp;/g, '') // Correction in malformed links
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function encode(text) {
  return (text || '')
    .replace(/&/g, '&#038;')
    .replace(/amp;/g, '') // Correction in malformed links
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function callback() {
  const posts = await Post.find().where('status').equals('publish').lean();

  // mongoose sort is slower
  posts.sort((o1, o2) => {
    return o1.date >= o2.date ? -1 : 1;
  });

  const publicFeedAllConfig = cloneDeep(rawFeedConfig);
  const publicFeedConfig = cloneDeep(rawFeedConfig);
  const privateFeedConfig = await getPrivateFeed();
  const lastPost = posts[posts.length - 1];

  let episode = posts.length + 1;
  const seasonYear = moment(lastPost.date_gmt).year();

  posts.forEach((post) => {
    episode -= 1;

    if (!post.mp3) return; // missing mp3 breaks the rss list

    let description;

    const extractedDescription = post.excerpt.rendered.match(/ Download (.*?)[<]/) || post.excerpt.rendered.match(/[>](.*?)[<]/);

    if (extractedDescription && extractedDescription.length && extractedDescription[1]) {
      [, description] = extractedDescription;
      description = decode(description);
    }

    const item = [
      {
        _name: 'enclosure',
        _attrs: {
          type: 'audio/mpeg',
          url: post.mp3,
          length: '1000'
        },
      },
      { 'itunes:episodeType': 'full' },
      { 'itunes:episode': episode },
      { 'itunes:season': seasonYear - moment(post.date_gmt).year() },
      { title: encode(post.title.rendered) },
      { 'itunes:title': encode(post.title.rendered) },
      { description: `<![CDATA[${post.description || description || post.title.rendered}]]>` },
      {
        _name: 'itunes:image',
        _attrs: {
          href: encode(post.mainImage)
        },
      },
      { link: encode(post.link) },
      { guid: parseInt(post.id, 10).toString(36) },
      { pubDate: moment.utc(post.date_gmt).format('ddd, DD MMM YYYY HH:mm:ss ZZ') },
      { 'itunes:explicit': 'no' },
      itunesCategory,
    ];

    // RSS item for each episode
    publicFeedConfig._content.channel.push({ item });
  });

  publicFeedAllConfig._content.channel = publicFeedConfig._content.channel;
  publicFeedConfig._content.channel = publicFeedConfig._content.channel.slice(0, 300);

  const xmlOptions = {
    header: true,
    indent: '  '
  };

  app.set('rssFeedPublicAll', toXML(publicFeedAllConfig, xmlOptions));
  app.set('rssFeedPublic', toXML(publicFeedConfig, xmlOptions));
  app.set('rssFeedPrivate', privateFeedConfig);
}

const rssFeed = {
  name: 'rssFeed',
  time: config.cron.RSS.time,
  timeZone: config.cron.RSS.timeZone,
  runOnInit: true,
  callback,
};

export default new CronItem(rssFeed);
