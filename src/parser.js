export function normalize(text){return text.toLowerCase().normalize('NFKC').replace(/[’']/g,'').replace(/\s+/g,' ').trim().replace(/[.!?,]+$/g,'').trim();}
export function noun(text){return normalize(text).replace(/^(the|a|an|some|my) /,'');}
export function parse(input){
  const text=normalize(input);if(!text)return {verb:'empty'};
  const short={l:'look',i:'inventory',inv:'inventory',x:'examine',n:'north',s:'south',e:'east',w:'west',se:'southeast',nw:'northwest'};
  const direct=['look','inventory','help','hint','journal','map','save','load','restart','wait','fish','north','south','east','west','southeast','northwest'];
  const expanded=short[text]||text;if(direct.includes(expanded))return {verb:expanded};
  const patterns=[
    [/^(?:talk(?: to)?|speak(?: to)?)\s+(.+)$/,'talk'],
    [/^ask (.+?) about (.+)$/,'ask'],
    [/^(?:give|deliver|offer) (.+?) to (.+)$/,'give'],
    [/^(?:use|apply|attach|fit|put) (.+?) (?:on|onto|to|in|into) (.+)$/,'use'],
    [/^(?:use|wear|equip|put on) (.+)$/,'use'],
    [/^(?:examine|inspect|read|look at|x|check|watch|observe) (.+)$/,'examine'],
    [/^(?:take|get|pick up|grab) (.+)$/,'take'],
    [/^(?:drop|set down) (.+)$/,'drop'],
    [/^(?:go(?: to)?|walk(?: to)?|enter|visit|return(?: to)?) (.+)$/,'go'],
    [/^(?:pick|gather|harvest) (?:a share|berries|blueberries|ripe berries|the berries|some berries)$/,'pick'],
    [/^(?:collect|gather) (?:sap|the sap)$/,'collect'],
    [/^(?:sort|inspect|clean) (?:rice|the rice|wild rice)$/,'sort'],
    [/^(?:wash|clean) (?:tray|the tray)$/,'wash'],
    [/^(?:repair|fix|seal) (?:joint|the joint|leak|the leak)$/,'repair'],
    [/^(?:compare) (?:charts|the charts|notes|notebook and chart|chart and notebook)$/,'compare'],
    [/^(?:report|admit|tell rose about) (?:the )?leak$/,'report']
  ];
  for(const [pattern,verb] of patterns){const m=text.match(pattern);if(m)return {verb,object:noun(m[1]||''),target:noun(m[2]||'')};}
  if(['take','drop','examine','use','give','ask','talk','go','pick','collect','sort'].includes(text))return {verb:'clarify',object:text};
  return {verb:'unknown',object:text};
}
