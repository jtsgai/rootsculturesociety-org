import { listPublishedStories } from '../lib/member-publication';

const section = document.querySelector<HTMLElement>('[data-published-stories]');
const list = document.querySelector<HTMLElement>('[data-published-story-list]');
const lang = section?.dataset.lang ?? 'zh';

function render() {
  if (!section || !list) return;
  list.replaceChildren();
  if (!stories.length) return;
  section.hidden = false;
  stories.forEach((story) => {
    const article = document.createElement('article');
    article.className = 'published-story-card';
    const label = document.createElement('span');
    label.className = 'eyebrow';
    label.textContent = lang === 'en' ? 'MEMBER STORY' : '会员故事';
    const title = document.createElement('h3');
    title.textContent = story.title;
    const summary = document.createElement('p');
    summary.textContent = String(story.content.summary ?? '');
    article.append(label, title, summary);
    list.append(article);
  });
}

let stories: Awaited<ReturnType<typeof listPublishedStories>> = [];

void (async () => {
  try {
    stories = await listPublishedStories();
    render();
  } catch {
    // The public page remains fully usable when Supabase is unavailable.
  }
})();
