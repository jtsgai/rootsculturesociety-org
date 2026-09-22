import { listPublishedActivityEvents, type ActivityEvent } from '../lib/activity-events';
import { isStudioConfigured } from '../lib/supabase';

const timeline = document.querySelector<HTMLElement>('[data-activity-events]');
const lang = timeline?.dataset.lang === 'en' ? 'en' : 'zh';

function renderTimeline(events: ActivityEvent[]) {
  if (!timeline || !events.length) return;
  const list = timeline.querySelector<HTMLElement>('.activity-record-list');
  if (!list) return;
  list.replaceChildren();
  events.forEach((event) => {
    const article = document.createElement('article');
    article.className = 'activity-highlight-item';
    if (event.image_path) {
      const figure = document.createElement('figure');
      figure.className = 'activity-record-image';
      const image = document.createElement('img');
      image.src = event.image_path;
      image.alt = lang === 'zh' ? event.image_alt_zh || event.title_zh : event.image_alt_en || event.title_en;
      image.loading = 'lazy';
      figure.append(image);
      article.append(figure);
    }
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
    article.append(year, content);
    list.append(article);
  });
}

if (isStudioConfigured) {
  void listPublishedActivityEvents().then((events) => {
    if (!events.length) return;
    renderTimeline(events);
  }).catch(() => {
    // Keep the curated static activity content when the optional database table
    // has not been migrated or is temporarily unavailable.
  });
}
