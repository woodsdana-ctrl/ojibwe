const SEASONS = ['All', 'History', 'Spring', 'Summer', 'Fall', 'Winter'];
const KIND_LABELS = {document: 'Primary document', photograph: 'Historical photograph', object: 'Museum object', record: 'Original record'};
const ORIGINAL_LABELS = {document: 'View original document', photograph: 'View original photograph', object: 'View museum object', record: 'View original record'};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function externalLink(url, text, className = '') {
  if (typeof url !== 'string' || !url.trim()) return null;
  try {
    const parsed = new URL(url, document.baseURI);
    if (!['https:', 'http:'].includes(parsed.protocol)) return null;
    const link = element('a', className, text);
    link.href = parsed.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  } catch {
    return null;
  }
}

// Archive images are never fetched automatically. Only bundled local assets may be displayed.
function localAsset(path) {
  if (typeof path !== 'string' || !path.trim() || /[:\\]/.test(path) || path.startsWith('//')) return null;
  const parsed = new URL(path, document.baseURI);
  return parsed.origin === location.origin ? path : null;
}

function paragraphs(parent, value, className) {
  const parts = Array.isArray(value) ? value : String(value || '').split(/\n\s*\n/);
  for (const part of parts) if (part) parent.append(element('p', className, part));
}

function section(title, className = '') {
  const node = element('section', 'source-section ' + className);
  node.append(element('h4', '', title));
  return node;
}

/** Mount the source shelf without changing the game or its saved state. */
export function mountSourceViewer({library = [], getLocation = () => null} = {}) {
  const sources = Array.isArray(library) ? library : [];
  let activeFilter = 'All';
  let selectedId = null;
  let returnFocus = null;

  const dialog = element('dialog', 'source-dialog');
  dialog.setAttribute('aria-labelledby', 'source-viewer-title');
  const header = element('div', 'source-header');
  const headerText = element('div');
  headerText.append(element('p', 'source-eyebrow', 'THE SOURCE SHELF'));
  const heading = element('h2', '', 'Real sources, real lives');
  heading.id = 'source-viewer-title';
  headerText.append(heading, element('p', 'source-intro', 'Explore documents, photographs, and objects behind the story.'));
  const close = element('button', 'source-close', 'Close ×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close source shelf');
  close.addEventListener('click', () => dialog.close());
  header.append(headerText, close);

  const filters = element('div', 'source-filters');
  filters.setAttribute('role', 'group');
  filters.setAttribute('aria-label', 'Filter sources by season or history');
  const filterButtons = SEASONS.map(label => {
    const button = element('button', 'source-filter', label);
    button.type = 'button';
    button.dataset.filter = label;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => setFilter(label));
    filters.append(button);
    return button;
  });
  filters.addEventListener('keydown', event => {
    const index = filterButtons.indexOf(document.activeElement);
    if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? filterButtons.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + filterButtons.length) % filterButtons.length;
    filterButtons[next].focus();
    setFilter(SEASONS[next]);
  });

  const body = element('div', 'source-body');
  const navigation = element('nav', 'source-navigation');
  navigation.setAttribute('aria-label', 'Available historical sources');
  const nearby = element('p', 'source-nearby');
  const list = element('ul', 'source-list');
  navigation.append(nearby, list);
  const detail = element('article', 'source-detail');
  detail.tabIndex = 0;
  detail.setAttribute('aria-label', 'Selected source details');
  const announcement = element('p', 'sr-only');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  body.append(navigation, detail);
  dialog.append(header, filters, body, announcement);
  document.body.append(dialog);

  dialog.addEventListener('close', () => {
    const target = returnFocus?.isConnected ? returnFocus : document.getElementById('command');
    target?.focus({preventScroll: true});
  });

  function roomId() {
    const current = getLocation();
    return typeof current === 'object' && current ? current.id : current;
  }

  function isNearby(source) {
    return Array.isArray(source.rooms) && source.rooms.includes(roomId());
  }

  function filteredSources() {
    return sources.filter(source => activeFilter === 'All' || source.season === activeFilter);
  }

  function renderList() {
    const relevantCount = sources.filter(isNearby).length;
    nearby.textContent = relevantCount ? '◆ Sources connected to your current location' : 'Choose a source to look closer.';
    for (const button of filterButtons) button.setAttribute('aria-pressed', String(button.dataset.filter === activeFilter));
    list.replaceChildren();
    const available = filteredSources();
    if (!available.length) {
      list.append(element('li', 'source-empty', 'No sources in this section yet. Try All.'));
      return;
    }
    for (const source of available) {
      const item = element('li');
      const button = element('button', 'source-choice');
      button.type = 'button';
      button.dataset.sourceId = source.id;
      button.setAttribute('aria-pressed', String(source.id === selectedId));
      const label = element('span', 'source-choice-kind', KIND_LABELS[source.kind] || 'Historical source');
      const title = element('span', 'source-choice-title', source.title);
      const date = element('span', 'source-choice-date', [source.season, source.date || 'Date not recorded'].filter(Boolean).join(' · '));
      button.append(label, title, date);
      if (isNearby(source)) button.append(element('span', 'source-choice-nearby', '◆ In this part of your journey'));
      button.addEventListener('click', () => select(source.id, true, true));
      item.append(button);
      list.append(item);
    }
  }

  function renderDetail() {
    detail.replaceChildren();
    const source = sources.find(item => item.id === selectedId);
    if (!source) {
      detail.append(element('h3', '', 'A closer look'), element('p', '', 'Choose a source from the shelf.'));
      return;
    }
    const badge = element('p', 'source-badge', [KIND_LABELS[source.kind] || 'Historical source', source.season].filter(Boolean).join(' / '));
    detail.append(badge, element('h3', 'source-title', source.title));
    const imagePath = source.rights?.canEmbed === true ? localAsset(source.imagePath) : null;
    const pdfPath = source.rights?.canEmbed === true ? localAsset(source.pdfPath) : null;
    const pages = source.rights?.canEmbed === true && Array.isArray(source.pages)
      ? source.pages.filter(page => localAsset(page.imagePath)) : [];
    if (!pages.length && imagePath) pages.push({imagePath, label: 'Document scan'});
    let fullScanLink = null;

    if (pages.length) {
      const figure = element('figure', 'source-facsimile');
      const image = element('img');
      image.loading = 'lazy';
      image.decoding = 'async';
      const imageError = element('p', 'source-image-error', 'The scan could not be displayed. Open the full-size scan or the original document below.');
      imageError.hidden = true;
      image.addEventListener('error', () => {
        image.hidden = true;
        imageError.hidden = false;
      });
      image.addEventListener('load', () => {
        image.hidden = false;
        imageError.hidden = true;
      });
      figure.append(image, imageError);
      if (source.caption) figure.append(element('figcaption', '', source.caption));
      fullScanLink = element('a', 'source-link-button', 'Open full-size scan');
      fullScanLink.target = '_blank';
      fullScanLink.rel = 'noopener';
      let pageIndex = Math.max(0, pages.findIndex(page => page.imagePath === imagePath));
      const pager = element('div', 'source-page-controls');
      const previous = element('button', '', '← Previous');
      previous.type = 'button';
      previous.setAttribute('aria-label', 'Show previous facsimile page');
      const pageLabel = element('span', 'source-scan-page');
      pageLabel.setAttribute('aria-live', 'polite');
      const next = element('button', '', 'Next →');
      next.type = 'button';
      next.setAttribute('aria-label', 'Show next facsimile page');
      function showPage() {
        const page = pages[pageIndex];
        const label = page.label || 'Scan ' + (pageIndex + 1);
        image.hidden = false;
        imageError.hidden = true;
        image.alt = (source.caption || 'Facsimile of ' + source.title) + ' — ' + label;
        image.src = page.imagePath;
        fullScanLink.href = page.imagePath;
        fullScanLink.setAttribute('aria-label', 'Open full-size scan: ' + label);
        pageLabel.textContent = pages.length > 1 ? `${pageIndex + 1} / ${pages.length} · ${label}` : label;
        previous.disabled = pageIndex === 0;
        next.disabled = pageIndex === pages.length - 1;
      }
      previous.addEventListener('click', () => {pageIndex--;showPage();if (previous.disabled) next.focus();});
      next.addEventListener('click', () => {pageIndex++;showPage();if (next.disabled) previous.focus();});
      if (pages.length > 1) {
        pager.append(previous, pageLabel, next);
        figure.append(pager);
      }
      showPage();
      detail.append(figure);
    } else {
      const preview = element('div', 'source-archive-preview');
      preview.append(element('span', 'source-preview-symbol', source.kind === 'photograph' ? '▧' : source.kind === 'object' ? '◇' : '≡'));
      preview.lastElementChild.setAttribute('aria-hidden', 'true');
      paragraphs(preview, source.caption || 'Explore this source in the collection that preserves it.');
      detail.append(preview);
    }

    const links = element('div', 'source-links');
    if (fullScanLink) links.append(fullScanLink);
    if (pdfPath) {
      const pdf = element('a', 'source-link-button', 'Open / download PDF');
      pdf.href = pdfPath;
      pdf.target = '_blank';
      pdf.rel = 'noopener';
      links.append(pdf);
    }
    const original = externalLink(source.sourceUrl, ORIGINAL_LABELS[source.kind] || 'View original source', 'source-link-button source-link-original');
    if (original) links.append(original);
    if (links.children.length) detail.append(links);

    const metadata = element('dl', 'source-metadata');
    for (const [label, value, fallback] of [
      ['Date', source.date, 'Date not recorded'],
      ['Place', source.place, 'Place not recorded'],
      ['Creator', source.creator, 'Creator not recorded'],
      ['Collection', source.repository, 'Repository not recorded']
    ]) {
      const row = element('div');
      row.append(element('dt', '', label), element('dd', '', value || fallback));
      metadata.append(row);
    }
    detail.append(metadata);

    if (Array.isArray(source.transcript) && source.transcript.length) {
      const transcript = section('Words from the source', 'source-transcription');
      transcript.append(element('p', 'source-section-note', 'Transcribed excerpts from the original.'));
      for (const excerpt of source.transcript) {
        const page = String(excerpt.page || 'Excerpt');
        transcript.append(element('p', 'source-page-label', /^\d+$/.test(page) ? 'Page ' + page : page));
        transcript.append(element('blockquote', '', excerpt.text || ''));
      }
      detail.append(transcript);
    }

    if (source.context) {
      const context = section('About this source');
      paragraphs(context, source.context);
      detail.append(context);
    }
    if (source.gameConnection) {
      const connection = section('Connection to the story', 'source-story-note');
      paragraphs(connection, source.gameConnection);
      detail.append(connection);
    }
    if (Array.isArray(source.questions) && source.questions.length) {
      const questions = section('Look closer', 'source-questions');
      const ordered = element('ol');
      for (const question of source.questions) ordered.append(element('li', '', question));
      questions.append(ordered);
      detail.append(questions);
    }

    const credit = section('Credit and use', 'source-credit');
    paragraphs(credit, source.rights?.statement || 'Reproduction permission is not recorded. Use the original collection link to view this source.');
    const rightsLink = externalLink(source.rights?.url, 'Collection rights information');
    if (source.rights?.url && rightsLink) credit.append(rightsLink);
    if (source.originalTitle && source.originalTitle !== source.title) {
      const catalogTitle = element('details', 'source-catalog-title');
      catalogTitle.append(element('summary', '', 'Original catalog title'), element('p', '', source.originalTitle));
      credit.append(catalogTitle);
    }
    if (Array.isArray(source.missingMetadata) && source.missingMetadata.length) {
      const missing = element('p', 'source-missing-metadata', 'Not recorded in the available catalog: ' + source.missingMetadata.join('; ') + '.');
      credit.append(missing);
    }
    detail.append(credit);
  }

  function select(id, announce = false, focusSelected = false) {
    selectedId = id;
    renderList();
    renderDetail();
    detail.scrollTop = 0;
    if (focusSelected) Array.from(list.querySelectorAll('button')).find(button => button.dataset.sourceId === id)?.focus({preventScroll: true});
    if (announce) announcement.textContent = 'Selected source: ' + (sources.find(source => source.id === id)?.title || 'none');
  }

  function setFilter(label) {
    activeFilter = label;
    const available = filteredSources();
    const next = available.find(source => source.id === selectedId) || available.find(isNearby) || available[0];
    select(next?.id || null, true);
    announcement.textContent = label + ': ' + available.length + ' source' + (available.length === 1 ? '' : 's') + '.';
  }

  function open(id) {
    const selected = sources.find(source => source.id === id) || sources.find(isNearby) || sources[0];
    activeFilter = 'All';
    select(selected?.id || null);
    if (!dialog.open) {
      returnFocus = document.activeElement;
      dialog.showModal();
      close.focus({preventScroll: true});
    }
  }

  function refresh() {
    renderList();
  }

  renderList();
  renderDetail();
  return {open, refresh};
}
