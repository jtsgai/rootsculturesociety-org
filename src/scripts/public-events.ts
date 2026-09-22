import { listPublishedActivityEvents, type ActivityEvent } from '../lib/activity-events';
import { isStudioConfigured } from '../lib/supabase';

const gallery = document.querySelector<HTMLElement>('[data-activity-gallery]');
const timeline = document.querySelector<HTMLElement>('[data-activity-events]');
const lang = timeline?.dataset.lang === 'en' ? 'en' : 'zh';

function addSource(parent: HTMLElement, event: ActivityEvent) {
  if (!event.source_url) return;
  const link = document.createElement('a');
  link.className = 'inline-download';
  link.href = event.source_url;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = `${lang === 'zh' ? event.source_label_zh || '查看活动资料' : event.source_label_en || 'View activity record'} `;
  const arrow = document.createElement('span');
  arrow.textContent = '↗';
  link.append(arrow);
  parent.append(link);
}

function renderGallery(events: ActivityEvent[]) {
  if (!gallery) return;
  const withImages = events.filter((event) => event.image_path);
  if (!withImages.length) return;
  gallery.replaceChildren();
  withImages.forEach((event) => {
    const figure = document.createElement('figure');
    const image = document.createElement('img');
    image.src = event.image_path || '';
    image.alt = lang === 'zh' ? event.image_alt_zh || event.title_zh : event.image_alt_en || event.title_en;
    image.loading = 'lazy';
    const caption = document.createElement('figcaption');
    caption.textContent = lang === 'zh' ? event.title_zh : event.title_en;
    figure.append(image, caption);
    gallery.append(figure);
  });
}

function renderTimeline(events: ActivityEvent[]) {
  if (!timeline || !events.length) return;
  const list = timeline.querySelector<HTMLElement>('.activity-record-list');
  if (!list) return;
  list.replaceChildren();
  events.forEach((event) => {
    const article = document.createElement('article');
    const year = document.createElement('div');
    year.className = 'activity-record-year';
    year.textContent = lang === 'zh' ? event.date_label_zh || event.event_date || '' : event.date_label_en || event.event_date || '';
    const content = document.createElement('div');
    const heading = document.createElement('h2');
    heading.textContent = lang === 'zh' ? event.title_zh : event.title_en;
    const summary = document.createElement('p');
    summary.textContent = lang === 'zh' ? event.summary_zh : event.summary_en;
    content.append(heading, summary);
    const location = lang === 'zh' ? event.location_zh : event.location_en;
    if (location) {
      const place = document.createElement('p');
      place.className = 'activity-record-location';
      place.textContent = `${lang === 'zh' ? '地点：' : 'Location: '}${location}`;
      content.append(place);
    }
    addSource(content, event);
    article.append(year, content);
    list.append(article);
  });
}

if (isStudioConfigured) {
  void listPublishedActivityEvents().then((events) => {
    if (!events.length) return;
    renderGallery(events);
    renderTimeline(events);
  }).catch(() => {
    // Keep the curated static activity content when the optional database table
    // has not been migrated or is temporarily unavailable.
  });
}
