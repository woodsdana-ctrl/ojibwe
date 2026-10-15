// Illustrated scenes are fiction. The document thumbnails below are actual
// government-publication scans, kept separate from the fictional scene art.
export const sceneDescriptions = {
  kitchen: 'An illustrated northern Minnesota kitchen with a wooden table, a canvas tote, a feast list, a framed family photograph, and a window looking toward the lake.',
  trail: 'An illustrated path beside a lake, with a split pine and branching paths through spring, summer, fall, and winter.',
  weather: 'An illustrated spring weather station at the forest edge, with a temperature chart and a collection pail near the path to the maple grove.',
  grove: 'An illustrated maple grove in spring 1926, with bare branches, patches of snow, and a folded birch-bark sap bucket on a wooden stand.',
  sugarhouse: 'An illustrated wooden sugarhouse in spring 1926, with steam rising above the boiler and a shoreline notebook resting near the work area.',
  summeredge: 'An illustrated summer picnic shelter beside the woods, with a berry basket and a picnic table overlooking the path to the blueberry plot.',
  patch: 'An illustrated maintained blueberry plot in summer, with ripe berries, marked plants, a basket, and a loose picnic cloth.',
  landing: 'An illustrated autumn lakeshore station, with golden trees, a dock, and a field chart for present-day water observations.',
  shed: 'An illustrated rice shed in fall 1926, with a basin, a sorting tray, and a work table for an already prepared and cooled wild-rice batch.',
  hut: 'An illustrated winter equipment hut with a rod, prepared fishing line, and warm mittens, near the family’s established route.',
  shelter: 'An illustrated fishing shelter in winter with a prepared fishing station, a rod, and a bobber. This fictional picture does not establish ice safety.',
  archive: 'An illustrated community records room with a wooden reading table, archive shelves, a reservation diagram, and a family photograph awaiting its caption.'
};

const sceneObjects = {
  kitchen: [['photo', 'Family photo', 32, 59], ['list', 'Feast list', 54, 74], ['tote', 'Canvas tote', 20, 65, 'left']],
  trail: [['pine', 'Split pine', 71, 47], ['stick', 'A stick', 30, 92]],
  weather: [['temperature log', 'Temperature log', 65, 48], ['pail', 'Transfer pail', 53, 72]],
  grove: [['tree', 'Sugar maple', 48, 49], ['collection basket', 'Sap bucket', 44, 76], ['support', 'Wooden support', 55, 90, 'left']],
  sugarhouse: [['boiler', 'The boiler', 41, 58], ['labels', 'Sap or syrup?', 85, 68, 'right'], ['notebook', 'Shoreline notebook', 71, 69, 'left']],
  summeredge: [['sign', 'Plot sign', 17, 58], ['basket', 'Berry basket', 35, 67]],
  patch: [['markers', 'Plot markers', 33, 67], ['berries', 'Blueberries', 21, 80], ['cloth', 'Picnic cloth', 58, 79]],
  landing: [['water chart', 'Water chart', 27, 51], ['dock', 'The old dock', 50, 79]],
  shed: [['basin', 'Wash basin', 71, 71], ['tray', 'Sorting tray', 46, 73, 'left']],
  hut: [['rod', 'Fishing rod', 75, 61], ['mittens', 'Warm mittens', 77, 78]],
  shelter: [['bobber', 'Watch the bobber', 49, 84]],
  archive: [['reservation map', 'Illustrative boundary diagram', 42, 28, 'left'], ['photo', 'Fictional family photo', 60, 27, 'right']]
};

const sourceNames = {treaty1855: ['1855', 'Treaty'], nelson1889: ['1889', 'Nelson Act'], restoration2020: ['2020', 'Restoration Act']};
const historicRooms = new Set(['grove', 'sugarhouse', 'shed']);

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function mountSceneView({container, content, onCommand, onSource}) {
  if (!container) throw new Error('The illustrated scene needs a container.');
  container.classList.add('scene-view');
  let lastKey = '';

  function commandButton(label, command, className) {
    const button = element('button', className, label);
    button.type = 'button';
    button.dataset.sceneCommand = command;
    button.addEventListener('click', () => onCommand(command));
    return button;
  }

  function documentObjects(location) {
    if (location !== 'archive') return null;
    const group = element('div', 'scene-table-documents');
    group.setAttribute('aria-label', 'Authentic primary-source pages on the reading table');
    for (const id of ['treaty1855', 'nelson1889', 'restoration2020']) {
      const source = content.sourceLibrary.find(record => record.id === id);
      if (!source?.rights?.canEmbed || !/^\.\/assets\/documents\/[\w.-]+\.png$/.test(source.imagePath || '')) continue;
      const button = element('button', 'scene-document-object');
      button.type = 'button';
      button.dataset.sourceId = id;
      button.title = `${source.title} · actual printed source · U.S. GPO / GovInfo · public domain`;
      button.setAttribute('aria-label', `Read actual source on the table: ${source.title}. Credit: U.S. Government Publishing Office / GovInfo. Public domain.`);
      const image = element('img');
      image.src = source.imagePath;
      image.alt = `Authentic printed page from ${source.title}`;
      image.decoding = 'async';
      button.append(image, element('span', '', sourceNames[id][0]));
      button.addEventListener('click', () => onSource(id));
      group.append(button);
    }
    return group;
  }

  function documentDesk(location, year) {
    const historic = historicRooms.has(location);
    if (!historic && !['kitchen', 'archive'].includes(location)) return null;
    const section = element('section', 'scene-document-desk');
    section.setAttribute('aria-label', historic ? 'Notebook evidence: authentic historical sources' : 'Actual primary sources on the reading table');
    const heading = element('div', 'scene-desk-heading');
    heading.append(element('span', 'scene-desk-icon', '§'), element('h3', '', historic ? 'Notebook evidence' : 'On the records table'));
    heading.append(element('span', 'scene-source-kind', historic ? 'Editorial comparison' : 'Actual source scans'));
    const cards = element('div', 'scene-source-cards');
    for (const id of ['treaty1855', 'nelson1889', ...(year === '2026' ? ['restoration2020'] : [])]) {
      const source = content.sourceLibrary.find(record => record.id === id);
      // Only permission-cleared local facsimiles may appear inside the game.
      if (!source?.rights?.canEmbed || !/^\.\/assets\/documents\/[\w.-]+\.png$/.test(source.imagePath || '')) continue;
      const [date, name] = sourceNames[id];
      const button = element('button', 'scene-source');
      button.type = 'button';
      button.dataset.sourceId = id;
      button.setAttribute('aria-label', `Examine actual source: ${source.title}. ${source.citation}. Credit: U.S. Government Publishing Office / GovInfo. Public domain.`);
      button.title = `${source.title} · authentic printed page · opens the full source viewer`;
      const page = element('span', 'scene-source-page');
      const image = element('img', 'scene-source-image');
      image.src = source.imagePath;
      image.alt = `Actual printed page from ${source.title}`;
      image.loading = 'lazy';
      page.append(image);
      const label = element('span', 'scene-source-label');
      label.append(element('strong', '', date), element('span', '', name));
      button.append(page, label);
      button.addEventListener('click', () => onSource(id));
      cards.append(button);
    }
    const caption = element('p', 'scene-source-caption', historic
      ? 'Real records beside a fictional scene—not the family’s own papers. U.S. GPO / GovInfo · public domain.'
      : 'Authentic printed legal records · U.S. GPO / GovInfo · public domain. Click a page to read, enlarge, and compare.');
    section.append(heading, cards, caption);
    return section;
  }

  return {
    refresh(state) {
      const room = content.locations[state.location];
      if (!room) return;
      const available = Object.entries(state.items).filter(([, position]) => position === state.location).map(([id]) => id);
      const key = JSON.stringify([state.location, available, state.ended]);
      if (key === lastKey) return;
      lastKey = key;
      const year = room.time === '1926' ? '1926' : '2026';
      container.dataset.location = state.location;
      container.dataset.era = year;
      const heading = element('div', 'scene-heading');
      const title = element('div', 'scene-heading-copy');
      title.append(element('p', 'scene-chapter', room.chapter === room.season ? room.chapter : `${room.chapter} · ${room.season === 'Present day' ? 'At home' : room.season}`), element('h2', '', room.name));
      const era = element('span', `scene-era${year === '1926' ? ' scene-era-past' : ''}`);
      era.dataset.year = year;
      era.append(element('strong', '', year), element('span', '', year === '1926' ? 'With your ancestors' : state.location === 'trail' ? 'Homeward trail' : 'Present day'));
      heading.append(title, era);

      const figure = element('figure', 'scene-figure');
      const picture = element('div', 'scene-picture');
      const image = element('img', 'scene-art');
      image.src = `./assets/illustrations/${state.location}.svg`;
      image.alt = sceneDescriptions[state.location] || room.name;
      image.dataset.location = state.location;
      image.width = 1200;
      image.height = 600;
      image.decoding = 'async';
      picture.append(image);
      const hotspots = element('div', 'scene-hotspots');
      hotspots.setAttribute('aria-label', 'Objects to examine in this scene');
      for (const [id, label, x, y, side] of sceneObjects[state.location] || []) {
        // A portable object disappears from the scene once collected. Objects
        // absent from state.items are fixtures rather than loose inventory.
        if (Object.hasOwn(state.items, id) && state.items[id] !== state.location) continue;
        const button = commandButton('', `EXAMINE ${id.toUpperCase()}`, 'scene-hotspot');
        button.style.setProperty('--spot-x', `${x}%`);
        button.style.setProperty('--spot-y', `${y}%`);
        button.dataset.labelSide = side || (x >= 60 ? 'left' : 'right');
        button.setAttribute('aria-label', `Examine ${label}`);
        button.title = `Examine ${label}`;
        button.append(element('span', 'scene-hotspot-dot', '+'), element('span', 'scene-hotspot-label', label));
        hotspots.append(button);
      }
      picture.append(hotspots);
      const tableDocuments = documentObjects(state.location);
      if (tableDocuments) picture.append(tableDocuments);
      const caption = element('figcaption', 'scene-art-caption');
      caption.append(element('span', '', state.location === 'archive' ? 'Fictional scene · actual source scans on the table' : 'Fictional illustration'), element('span', '', 'Select + to examine'));
      figure.append(picture, caption);

      const people = element('div', 'scene-people');
      people.setAttribute('aria-label', 'People here');
      for (const id of room.characters) {
        const person = content.characters[id];
        const button = commandButton('', `TALK TO ${person.name.toUpperCase()}`, 'scene-person');
        button.dataset.character = id;
        button.setAttribute('aria-label', `Talk to ${person.name}, ${year === '1926' ? 'your ancestor in 1926' : 'here in 2026'}`);
        const portrait = element('img', 'scene-portrait');
        portrait.src = `./assets/portraits/${id}.svg`;
        portrait.alt = `Fictional illustrated portrait of ${person.name}`;
        portrait.width = 64;
        portrait.height = 64;
        const text = element('span', 'scene-person-text');
        text.append(element('strong', '', person.name), element('span', '', 'Talk together'));
        button.append(portrait, text);
        people.append(button);
      }

      const loose = element('div', 'scene-loose-items');
      loose.setAttribute('aria-label', 'Portable objects here');
      if (available.length) {
        loose.append(element('span', 'scene-pickup-label', 'Within reach'));
        for (const id of available) {
          const label = content.items[id]?.name || id;
          const button = commandButton(`+ ${label}`, `TAKE ${id.toUpperCase()}`, 'scene-take');
          button.setAttribute('aria-label', `Take ${label}`);
          loose.append(button);
        }
      }
      const desk = documentDesk(state.location, year);
      container.replaceChildren(heading, figure);
      if (people.childElementCount) container.append(people);
      if (loose.childElementCount) container.append(loose);
      if (desk) container.append(desk);
    }
  };
}
