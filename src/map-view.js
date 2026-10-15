import {exits} from './engine.js';

// An original story diagram, deliberately not a survey or a historical boundary map.
const POSITIONS = {
  kitchen: [27, 12], archive: [52, 12], trail: [27, 43],
  weather: [52, 36], grove: [80, 36], sugarhouse: [80, 12],
  summeredge: [9.5, 61], patch: [9.5, 85],
  landing: [52, 61], shed: [80, 61], hut: [27, 85], shelter: [52, 85]
};
const ORDER = ['kitchen', 'archive', 'trail', 'weather', 'summeredge', 'patch', 'landing', 'hut', 'shelter', 'grove', 'sugarhouse', 'shed'];
const SVG_NS = 'http://www.w3.org/2000/svg';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function svgNode(tag, attributes = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}

function smallDrawing(kind) {
  const svg = svgNode('svg', {viewBox: '0 0 32 32', 'aria-hidden': 'true', focusable: 'false'});
  const paths = {
    Home: 'M5 15 16 6 27 15M9 14v13h14V14M14 27v-8h5v8M21 7V4h3v6',
    'Home & history': 'M5 7h22v20H5ZM10 12h12M10 17h12M10 22h8M9 4h14',
    Trail: 'M16 28V5M16 5l-8 9h16ZM12 15l-6 7h20l-6-7M4 29c6-3 11 3 16 0s5-3 8-2',
    Spring: 'M16 4c0 7-9 10-9 17a9 9 0 0 0 18 0c0-7-9-10-9-17ZM11 21c0 3 2 5 5 5',
    Summer: 'M9 18a6 6 0 1 0 0 12 6 6 0 0 0 0-12ZM22 16a6 6 0 1 0 0 12 6 6 0 0 0 0-12ZM15 8c1-5 7-6 11-5-1 6-6 8-11 5ZM16 9l-3 8M8 16 6 12M22 14l3-4',
    Fall: 'M8 28 24 5M15 18l-6-3 4 8M19 12l-5-3 2 8M22 8l1-5 4 2M15 21l7-1-2 5M18 16l8-1-2 5M5 28h22',
    Winter: 'M16 3v26M5 9l22 14M5 23 27 9M12 6l4 4 4-4M12 26l4-4 4 4M6 13l5-1-1-5M26 19l-5 1 1 5M6 19l5 1-1 5M26 13l-5-1 1-5'
  };
  svg.append(svgNode('path', {d: paths[kind] || paths.Trail, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'}));
  return svg;
}

function addLandscape(svg) {
  const shore = svgNode('g', {class: 'map-landscape'});
  shore.append(svgNode('path', {class: 'map-lake', d: 'M41 173C84 137 169 176 181 223S141 284 163 322 191 373 147 410 53 409 34 368 63 307 38 266 12 209 41 173Z'}));
  for (const y of [233, 272, 310, 348]) shore.append(svgNode('path', {class: 'map-waterline', d: `M66 ${y}q18-8 36 0t36 0`}));
  for (const [x, y, scale] of [[596, 171, 1], [620, 196, .8], [580, 202, .7], [173, 586, 1], [193, 616, .8], [693, 721, .9], [720, 742, .7], [926, 414, 1], [907, 443, .7]]) {
    const tree = svgNode('g', {transform: `translate(${x} ${y}) scale(${scale})`});
    tree.append(svgNode('path', {class: 'map-tree', d: 'M0 0-13 24h8L-19 40h15v12H4V40H19L5 24h8Z'}));
    shore.append(tree);
  }
  const lakeLabel = svgNode('text', {x: 100, y: 445, 'text-anchor': 'middle', class: 'map-handnote'});
  lakeLabel.textContent = 'the familiar shore';
  shore.append(lakeLabel);
  svg.append(shore);
}

/** A visual map over the engine's existing routes; opening it never advances the story. */
export function mountMapView({content, onCommand = () => {}}) {
  let state = null;
  let returnFocus = null;
  const dialog = element('dialog', 'map-dialog');
  dialog.id = 'map-dialog';
  dialog.setAttribute('aria-labelledby', 'map-title');
  const header = element('div', 'map-header');
  const headingWrap = element('div');
  headingWrap.append(element('p', 'map-eyebrow', 'PAGES FROM YOUR FIELD JOURNAL'));
  const title = element('h2', '', 'The familiar trail');
  title.id = 'map-title';
  headingWrap.append(title, element('p', 'map-intro', 'Four seasons. Two centuries. One way home.'));
  const close = element('button', 'map-close', 'Close ×');
  close.id = 'map-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Close illustrated map');
  close.addEventListener('click', () => dialog.close());
  header.append(headingWrap, close);
  const current = element('p', 'map-current');
  current.setAttribute('role', 'status');
  const legend = element('ul', 'map-legend');
  legend.setAttribute('aria-label', 'Map key');
  for (const [className, label] of [['map-key-current', 'You are here'], ['map-key-visited', 'Visited'], ['map-key-ahead', 'Path ahead'], ['map-key-crossing', '1926 ↔ 2026 crossing']]) {
    const item = element('li');
    item.append(element('span', className), document.createTextNode(label));
    legend.append(item);
  }
  const board = element('div', 'map-board');
  const illustration = svgNode('svg', {viewBox: '0 0 1000 860', class: 'map-illustration', 'aria-hidden': 'true', focusable: 'false'});
  addLandscape(illustration);
  const routes = svgNode('g', {class: 'map-routes'});
  illustration.append(routes);
  const presentLabel = element('p', 'map-era map-era-present', '2026 · your family today');
  const pastLabel = element('p', 'map-era map-era-past', '1926 · the ancestors');
  const nodes = element('div', 'map-places');
  const emptyPast = element('p', 'map-empty-past', 'Earlier paths will appear here as you find them.');
  board.append(illustration, presentLabel, pastLabel, nodes, emptyPast);
  const footer = element('div', 'map-footer');
  const progress = element('p', 'map-progress');
  footer.append(progress, element('p', 'map-caveat', 'An illustrated story map, not a survey. Only visited places and exits from your current location are named. Select an open place to follow the game’s routes.'));
  dialog.append(header, current, legend, board, footer);
  document.body.append(dialog);
  dialog.addEventListener('close', () => {
    const target = returnFocus?.isConnected ? returnFocus : document.getElementById('command');
    target?.focus({preventScroll: true});
  });

  function render() {
    if (!state || !content?.locations?.[state.location]) return;
    const locations = content.locations;
    const visited = new Set(state.visited || []);
    visited.add(state.location);
    const immediate = exits(state);
    const visible = new Set([...visited, ...immediate.map(exit => exit.to)]);
    const reachable = new Set([state.location]);
    const queue = [state.location];
    for (let i = 0; i < queue.length; i++) for (const exit of exits({...state, location: queue[i]})) {
      if (!exit.locked && visible.has(exit.to) && !reachable.has(exit.to)) { reachable.add(exit.to); queue.push(exit.to); }
    }
    current.textContent = `You are at ${locations[state.location].name} · ${locations[state.location].time.includes('1926') ? '1926' : '2026'}`;
    progress.textContent = `${visited.size} of ${Object.keys(locations).length} places recorded`;
    emptyPast.hidden = [...visible].some(id => locations[id]?.time === '1926');
    nodes.replaceChildren();
    routes.replaceChildren();
    const edges = new Set();
    for (const [id, room] of Object.entries(locations)) for (const to of Object.values(room.exits || {})) {
      if (!visible.has(id) || !visible.has(to) || !POSITIONS[id] || !POSITIONS[to]) continue;
      const edge = [id, to].sort().join(':');
      if (edges.has(edge)) continue;
      edges.add(edge);
      const [x1, y1] = POSITIONS[id].map((value, index) => value * (index ? 8.6 : 10));
      const [x2, y2] = POSITIONS[to].map((value, index) => value * (index ? 8.6 : 10));
      const crossing = room.time.includes('1926') !== locations[to].time.includes('1926');
      const path = svgNode('path', {d: `M${x1} ${y1} Q${(x1 + x2) / 2 + (Math.abs(x1 - x2) < 20 ? 17 : 0)} ${(y1 + y2) / 2 + (Math.abs(y1 - y2) < 20 ? 14 : 0)} ${x2} ${y2}`, class: crossing ? 'map-route map-route-crossing' : 'map-route'});
      routes.append(path);
      if (crossing) {
        const label = svgNode('text', {x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 12, 'text-anchor': 'middle', class: 'map-crossing-label'});
        label.textContent = '100 years';
        routes.append(label);
      }
    }
    for (const id of ORDER.filter(id => visible.has(id))) {
      const room = locations[id];
      if (!room) continue;
      const here = id === state.location;
      const open = reachable.has(id);
      const button = element('button', 'map-place');
      button.type = 'button';
      button.dataset.location = id;
      button.dataset.visited = String(visited.has(id));
      button.dataset.current = String(here);
      button.dataset.past = String(room.time === '1926');
      button.dataset.season = room.chapter.toLowerCase().split(' ')[0];
      button.style.setProperty('--map-x', POSITIONS[id][0] + '%');
      button.style.setProperty('--map-y', POSITIONS[id][1] + '%');
      button.setAttribute('aria-label', `${room.name}, ${room.time.includes('1926') ? '1926' : '2026'}, ${here ? 'you are here' : !open ? 'route opens later' : visited.has(id) ? 'visited, travel here' : 'unexplored, follow this path'}`);
      if (here) button.setAttribute('aria-current', 'location');
      if (!open || here) button.setAttribute('aria-disabled', 'true');
      const icon = element('span', 'map-place-icon');
      icon.append(smallDrawing(room.chapter));
      const text = element('span', 'map-place-text');
      text.append(element('span', 'map-place-name', room.name), element('span', 'map-place-date', `${room.chapter} · ${room.time.includes('1926') ? '1926' : '2026'}`), element('span', 'map-place-status', here ? '● YOU ARE HERE' : !open ? 'ROUTE OPENS LATER' : visited.has(id) ? 'VISITED · TRAVEL HERE' : 'PATH AHEAD →'));
      const connections = Object.entries(room.exits).filter(([, to]) => visible.has(to)).map(([direction, to]) => `${direction} to ${locations[to].name}`);
      const routeNote = element('span', 'map-place-connections', 'Paths: ' + connections.join('; '));
      button.setAttribute('aria-description', 'Known paths: ' + connections.join('; '));
      text.append(routeNote);
      button.append(icon, text);
      button.addEventListener('click', () => {
        if (!open || here) return;
        dialog.close();
        onCommand('go ' + id);
      });
      nodes.append(button);
    }
  }

  return {
    open(nextState) {
      if (nextState) state = nextState;
      render();
      if (!dialog.open) { returnFocus = document.activeElement; dialog.showModal(); close.focus(); }
    },
    refresh(nextState) { if (nextState) state = nextState; if (dialog.open) render(); }
  };
}
