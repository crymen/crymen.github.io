'use strict';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizePath(value) {
  return String(value || '').replace(/^\/+|\/+$/g, '');
}

function urlWithRoot(root, path) {
  const normalizedRoot = `/${normalizePath(root)}`.replace(/\/$/, '');
  const normalizedPath = normalizePath(path);
  return `${normalizedRoot}/${normalizedPath}/`.replace(/\/{2,}/g, '/');
}

function absoluteUrl(siteUrl, path) {
  return `${String(siteUrl || '').replace(/\/+$/, '')}/${normalizePath(path)}/`;
}

function fallbackSlug(name) {
  const slug = String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || encodeURIComponent(name);
}

hexo.extend.generator.register('series', function seriesGenerator(locals) {
  const config = this.config.series_generator || {};
  const basePath = normalizePath(config.path || 'series');
  const configuredSlugs = config.slugs || {};
  const siteRoot = this.config.root || '/';
  const siteUrl = this.config.url || '';
  const groupedPosts = new Map();

  locals.posts.forEach(post => {
    if (!post.series) return;

    const name = String(post.series);
    if (!groupedPosts.has(name)) groupedPosts.set(name, []);
    groupedPosts.get(name).push(post);
  });

  const seriesList = Array.from(groupedPosts, ([name, posts]) => {
    posts.sort((left, right) => {
      const leftOrder = Number(left.series_order) || Number.MAX_SAFE_INTEGER;
      const rightOrder = Number(right.series_order) || Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.date - right.date;
    });

    posts.forEach((post, index) => {
      post.prev = posts[index - 1];
      post.next = posts[index + 1];
    });

    return {
      name,
      posts,
      slug: normalizePath(configuredSlugs[name] || fallbackSlug(name))
    };
  }).sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));

  if (!seriesList.length) return [];

  const latestDate = seriesList
    .flatMap(series => series.posts)
    .reduce((latest, post) => post.date > latest ? post.date : latest, new Date(0));

  const indexItems = seriesList.map(series => {
    const href = urlWithRoot(siteRoot, `${basePath}/${series.slug}`);
    return `<li><a href="${escapeHtml(href)}">${escapeHtml(series.name)}</a>（${series.posts.length} 篇）</li>`;
  }).join('\n');

  const routes = [{
    path: `${basePath}/index.html`,
    layout: ['page'],
    data: {
      title: '专题',
      layout: 'page',
      slug: 'series',
      path: `${basePath}/`,
      permalink: absoluteUrl(siteUrl, basePath),
      _id: 'series-index',
      date: latestDate,
      comments: false,
      content: `<ul class="series-list">\n${indexItems}\n</ul>`
    }
  }];

  seriesList.forEach(series => {
    const postItems = series.posts.map(post => {
      const order = Number(post.series_order);
      const label = Number.isFinite(order) ? String(order).padStart(2, '0') : '—';
      const href = urlWithRoot(siteRoot, post.path);
      return `<li value="${Number.isFinite(order) ? order : ''}"><span class="series-order">${label}</span> <a href="${escapeHtml(href)}">${escapeHtml(post.title)}</a></li>`;
    }).join('\n');

    routes.push({
      path: `${basePath}/${series.slug}/index.html`,
      layout: ['page'],
      data: {
        title: series.name,
        layout: 'page',
        slug: series.slug,
        path: `${basePath}/${series.slug}/`,
        permalink: absoluteUrl(siteUrl, `${basePath}/${series.slug}`),
        _id: `series-${series.slug}`,
        date: series.posts[series.posts.length - 1].date,
        comments: false,
        series: series.name,
        content: `<p>共 ${series.posts.length} 篇，按推荐阅读顺序排列。</p>\n<ol class="series-post-list">\n${postItems}\n</ol>`
      }
    });
  });

  return routes;
});
