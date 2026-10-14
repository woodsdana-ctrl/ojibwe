export function normalize(text){return text.toLowerCase().normalize('NFKC').replace(/[’']/g,'').replace(/\s+/g,' ').trim().replace(/[.!?,]+$/g,'').trim();}
export function noun(text){return normalize(text).replace(/^(the|a|an|some|my) /,'');}
export function parse(input){
  const text=normalize(input);if(!text)return {verb:'empty'};
  const short={l:'look',i:'inventory',inv:'inventory',x:'examine',n:'north',s:'south',e:'east',w:'west',se:'southeast',nw:'northwest'};
  const direct=['look','inventory','help','hint','journal','map','save','load','restart','timeline','wait','fish','north','south','east','west','southeast','northwest'];
  const expanded=short[text]||text;if(direct.includes(expanded))return {verb:expanded};
  const patterns=[
    [/^(?:talk(?: to)?|speak(?: to)?)\s+(.+)$/,'talk'],
    [/^(?:compare|read together) (?:records|the records|cards|the cards|maps|the maps)$/,'records'],
    [/^caption (.+?) (?:as|with) (.+)$/,'caption'],
    [/^ask (.+?) about (.+)$/,'ask'],
    [/^(?:label|name) (.+?) (?:as|with) (.+)$/,'label'],
    [/^match (.+?) to (.+)$/,'match'],
    [/^(?:translate|define|what is|what does) (.+?)(?: mean)?$/,'translate'],
    [/^say (.+)$/,'say'],
    [/^(?:give|deliver|offer) (.+?) to (.+)$/,'give'],
    [/^(?:use|apply|attach|fit|put) (.+?) (?:on|onto|to|in|into) (.+)$/,'use'],
    [/^(?:use|wear|equip|put on) (.+)$/,'use'],
    [/^(?:examine|inspect|read|look at|x|check|watch|observe) (.+)$/,'examine'],
    [/^(?:take|get|pick up|grab) (.+)$/,'take'],
    [/^(?:drop|set down) (.+)$/,'drop'],
    [/^(?:go(?: to)?|walk(?: to)?|enter|visit|return(?: to)?) (.+)$/,'go'],
    [/^(?:pick|gather|harvest) (?:a share|berries|blueberries|ripe berries|the berries|some berries|(?:the |some )?miinan|miin)$/,'pick'],
    [/^(?:collect|gather) (?:sap|the sap|ziinzibaakwadwaaboo)$/,'collect'],
    [/^(?:sort|inspect|clean) (?:rice|the rice|wild rice|manoomin)$/,'sort'],
    [/^(?:wash|clean) (?:tray|the tray)$/,'wash'],
    [/^(?:repair|fix|brace|steady|stabilize|support) (?:basket|the basket|stand|the stand|basket stand|the basket stand|collection basket|the collection basket)$/,'repair'],
    [/^(?:compare) (?:charts|the charts|notes|notebook and chart|chart and notebook)$/,'compare'],
    [/^(?:report|admit|tell rose about|tell waabigwan about) (?:the )?(?:wobble|spill|basket|tilt)$/,'report']
  ];
  for(const [pattern,verb] of patterns){const m=text.match(pattern);if(m)return {verb,object:noun(m[1]||''),target:noun(m[2]||'')};}
  if(['take','drop','examine','use','give','ask','talk','go','pick','collect','sort','label','match','translate','say'].includes(text))return {verb:'clarify',object:text};
  return {verb:'unknown',object:text};
}
