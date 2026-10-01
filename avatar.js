const avatarParts={
  hair:{folder:'hair',files:['hair01','hair02','hair03','hair04','hair05','hair06','hair07','hair08','hair09']},
  eyes:{folder:'eyes',files:['eyes01','eyes02','eyes03']},
  mouth:{folder:'mouth',files:['mouth01','mouth02','mouth03','mouth04']},
  outfit:{folder:'outfit',files:['outfit01','outfit02','outfit03','outfit04','outfit05','outfit06','outfit07','outfit08','outfit09','outfit10','outfit11','outfit12','outfit13','outfit14']},
  accessory:{folder:'accessory',files:['acc01','acc02','acc03','acc04','acc05','acc06','acc07','acc08','acc09','acc10']}
};
const avatarHighlights={folder:'highlight',files:['highlight01','highlight02']};

const avatarStorageKey='my-little-day-v3-avatar';
const avatarOutfitStorageKey='my-little-day-v3-avatar-outfits';
const defaultAvatarColor='#f0eded';
const readAvatarStorage=storageKey=>{
  try{const parsed=JSON.parse(localStorage.getItem(storageKey)||'null');return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{}}catch{return{}}
};
const hasAvatarFields=value=>value&&typeof value==='object'&&!Array.isArray(value)&&['hair','eyes','eyeHighlight','mouth','outfit','accessories','hairColor','eyeColor'].some(field=>Object.prototype.hasOwnProperty.call(value,field));
const normalizeAvatarSnapshot=value=>{
  const source=hasAvatarFields(value)?value:{};
  const part=type=>avatarParts[type].files.includes(source[type])?source[type]:'';
  const color=field=>/^#[0-9a-f]{6}$/i.test(source[field])?source[field].toLowerCase():defaultAvatarColor;
  return {hair:part('hair'),eyes:part('eyes'),eyeHighlight:avatarHighlights.files.includes(source.eyeHighlight)?source.eyeHighlight:'',mouth:part('mouth'),outfit:part('outfit'),accessories:Array.isArray(source.accessories)?[...new Set(source.accessories.filter(file=>avatarParts.accessory.files.includes(file)))]:[],hairColor:color('hairColor'),eyeColor:color('eyeColor')};
};
let fallbackAvatar=normalizeAvatarSnapshot(readAvatarStorage(avatarStorageKey));
let avatarOutfits=readAvatarStorage(avatarOutfitStorageKey);
const avatarSelection={hair:fallbackAvatar.hair,eyes:fallbackAvatar.eyes,eyeHighlight:fallbackAvatar.eyeHighlight,mouth:fallbackAvatar.mouth,outfit:fallbackAvatar.outfit,accessory:[...fallbackAvatar.accessories]};
const avatarColors={hair:fallbackAvatar.hairColor,eye:fallbackAvatar.eyeColor};
let activeAvatarPart='hair';
const avatarPath=(part,file)=>`avatar-assets/${avatarParts[part].folder}/${file}.png`;
const avatarHighlightPath=file=>`avatar-assets/${avatarHighlights.folder}/${file}.png`;
const avatarRoots=['avatar','dress-avatar'];
avatarRoots.forEach(root=>{
  const highlight=document.createElement('img');
  highlight.id=`${root}-highlight`;
  highlight.className='avatar-layer avatar-highlight';
  highlight.alt='';
  highlight.hidden=true;
  document.getElementById(`${root}-eyes`).after(highlight);
});

const tintedLayerCache=new Map();
let avatarRenderVersion=0;

const hexToRgb=hex=>({r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16)});
const pixelLuminance=(r,g,b)=>.2126*r+.7152*g+.0722*b;
const loadAvatarImage=source=>new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=()=>resolve(image);
  image.onerror=reject;
  image.src=source;
});

async function tintAvatarLayer(part,file,color){
  const cacheKey=`${part}:${file}:${color}`;
  if(tintedLayerCache.has(cacheKey))return tintedLayerCache.get(cacheKey);
  const tintPromise=loadAvatarImage(avatarPath(part,file)).then(image=>{
    const canvas=document.createElement('canvas');
    canvas.width=image.naturalWidth;
    canvas.height=image.naturalHeight;
    const context=canvas.getContext('2d');
    context.drawImage(image,0,0);
    const pixels=context.getImageData(0,0,canvas.width,canvas.height);
    const target=hexToRgb(color);
    for(let index=0;index<pixels.data.length;index+=4){
      const alpha=pixels.data[index+3];
      if(!alpha)continue;
      const red=pixels.data[index],green=pixels.data[index+1],blue=pixels.data[index+2];
      const luminance=pixelLuminance(red,green,blue);
      const neutral=Math.max(red,green,blue)-Math.min(red,green,blue)<=18;
      const colorable=part==='hair'?neutral&&luminance>145:neutral&&luminance>222;
      if(!colorable)continue;
      const shade=Math.min(1,luminance/237);
      pixels.data[index]=Math.round(target.r*shade);
      pixels.data[index+1]=Math.round(target.g*shade);
      pixels.data[index+2]=Math.round(target.b*shade);
    }
    context.putImageData(pixels,0,0);
    return canvas.toDataURL('image/png');
  });
  tintedLayerCache.set(cacheKey,tintPromise);
  return tintPromise;
}

function setAvatarImageLayer(part,source){
  avatarRoots.forEach(root=>{
    const layer=document.getElementById(`${root}-${part}`);
    layer.src=source;
    layer.hidden=false;
  });
}

function renderColorLayer(part,file,color,renderVersion){
  const source=avatarPath(part,file);
  setAvatarImageLayer(part,source);
  if(color===defaultAvatarColor)return;
  tintAvatarLayer(part,file,color).then(tintedSource=>{
    if(renderVersion===avatarRenderVersion&&avatarSelection[part]===file&&avatarColors[part==='hair'?'hair':'eye']===color)setAvatarImageLayer(part,tintedSource);
  }).catch(error=>console.error('Avatar tint error:',error));
}

function renderAvatar(){
  const renderVersion=++avatarRenderVersion;
  Object.entries(avatarSelection).forEach(([part,src])=>avatarRoots.forEach(root=>{
    const layer=document.getElementById(`${root}-${part==='eyeHighlight'?'highlight':part}`);
    if(part==='accessory'){
      layer.innerHTML=src.map(file=>`<img class="avatar-layer avatar-accessory-layer" src="${avatarPath(part,file)}" alt="">`).join('');
      layer.hidden=!src.length;
    }else if(!src){layer.removeAttribute('src');layer.hidden=true}
  }));
  if(avatarSelection.hair)renderColorLayer('hair',avatarSelection.hair,avatarColors.hair,renderVersion);
  if(avatarSelection.eyes)renderColorLayer('eyes',avatarSelection.eyes,avatarColors.eye,renderVersion);
  if(avatarSelection.eyeHighlight)setAvatarImageLayer('highlight',avatarHighlightPath(avatarSelection.eyeHighlight));
  ['mouth','outfit'].forEach(part=>{if(avatarSelection[part])setAvatarImageLayer(part,avatarPath(part,avatarSelection[part]))});
}

function createAvatarSnapshot(){
  return {hair:avatarSelection.hair,eyes:avatarSelection.eyes,eyeHighlight:avatarSelection.eyeHighlight,mouth:avatarSelection.mouth,outfit:avatarSelection.outfit,accessories:[...avatarSelection.accessory],hairColor:avatarColors.hair,eyeColor:avatarColors.eye};
}

function applyAvatarSnapshot(snapshot){
  const restored=normalizeAvatarSnapshot(snapshot);
  avatarSelection.hair=restored.hair;
  avatarSelection.eyes=restored.eyes;
  avatarSelection.eyeHighlight=restored.eyeHighlight;
  avatarSelection.mouth=restored.mouth;
  avatarSelection.outfit=restored.outfit;
  avatarSelection.accessory=[...restored.accessories];
  avatarColors.hair=restored.hairColor;
  avatarColors.eye=restored.eyeColor;
  renderAvatar();
}

function loadAvatarOutfit(date){
  const outfit=avatarOutfits[date];
  applyAvatarSnapshot(hasAvatarFields(outfit)?outfit:fallbackAvatar);
}

const colorPresets=[
  ['WHITE','#f0eded'],['BLACK','#2b2930'],['BROWN','#604F45'],['BLONDE','#e4c56f'],
  ['PINK','#e79fba'],['BLUE','#789bd0'],['RED','#bf6670'],['PURPLE','#9a7dbc']
];

function renderColorControls(){
  const colorKey=activeAvatarPart==='hair'?'hair':activeAvatarPart==='eyes'?'eye':'';
  if(!colorKey)return'';
  const color=avatarColors[colorKey];
  const title=colorKey==='hair'?'HAIR COLOR':'EYE COLOR';
  return `<div class="avatar-color-picker"><b class="avatar-color-picker__title">${title}</b><div class="avatar-color-picker__choices">${colorPresets.map(([name,value])=>`<button type="button" class="avatar-color-swatch ${color===value?'selected':''}" data-avatar-color="${value}" style="--avatar-swatch:${value}" aria-label="${name}" title="${name}"><span></span></button>`).join('')}<label class="avatar-color-custom" title="CUSTOM COLOR"><input type="color" value="${color}" data-avatar-color-input="${colorKey}"><small>CUSTOM</small></label></div></div>`;
}

function renderDressOptions(){
  const files=avatarParts[activeAvatarPart].files;
  const selected=activeAvatarPart==='accessory'?avatarSelection.accessory:[];
  const options=activeAvatarPart==='eyes'?[`<button type="button" class="avatar-option avatar-option--none ${!avatarSelection.eyes?'selected':''}" data-avatar-file="">NONE</button>`,...files.map(file=>`<button type="button" class="avatar-option ${avatarSelection.eyes===file?'selected':''}" data-avatar-file="${file}" aria-label="eyes ${file}"><img src="${avatarPath('eyes',file)}" alt=""></button>`),...avatarHighlights.files.map(file=>`<button type="button" class="avatar-option ${avatarSelection.eyeHighlight===file?'selected':''}" data-avatar-highlight="${file}" aria-label="highlight ${file}"><img src="${avatarHighlightPath(file)}" alt=""></button>`)].join(''):[`<button type="button" class="avatar-option avatar-option--none ${activeAvatarPart==='accessory'?(!selected.length?'selected':''):(!avatarSelection[activeAvatarPart]?'selected':'')}" data-avatar-file="">NONE</button>`,...files.map(file=>`<button type="button" class="avatar-option ${activeAvatarPart==='accessory'?(selected.includes(file)?'selected':''):(avatarSelection[activeAvatarPart]===file?'selected':'')}" data-avatar-file="${file}" aria-label="${activeAvatarPart} ${file}"><img src="${avatarPath(activeAvatarPart,file)}" alt=""></button>`)].join('');
  document.getElementById('dressOptions').innerHTML=`<div class="dress-part-options">${options}</div>${renderColorControls()}`;
}

function renderDressTabs(){
  document.getElementById('dressTabs').innerHTML=Object.keys(avatarParts).map(part=>`<button type="button" class="dress-tab ${part===activeAvatarPart?'selected':''}" data-avatar-tab="${part}" role="tab" aria-selected="${part===activeAvatarPart}">${part.toUpperCase()}</button>`).join('');
}

document.getElementById('dressUp').onclick=()=>{
  document.getElementById('dressRoom').hidden=false;
  document.querySelector('main').classList.add('dress-room-open');
  renderAvatar();
  renderDressTabs();
  renderDressOptions();
};

document.getElementById('dressTabs').onclick=e=>{
  const tab=e.target.closest('[data-avatar-tab]');
  if(!tab)return;
  activeAvatarPart=tab.dataset.avatarTab;
  renderDressTabs();
  renderDressOptions();
};

document.getElementById('dressOptions').onclick=e=>{
  const colorButton=e.target.closest('[data-avatar-color]');
  if(colorButton){
    const colorKey=activeAvatarPart==='hair'?'hair':activeAvatarPart==='eyes'?'eye':'';
    if(!colorKey)return;
    avatarColors[colorKey]=colorButton.dataset.avatarColor;
    renderAvatar();
    renderDressOptions();
    return;
  }
  const highlightOption=e.target.closest('[data-avatar-highlight]');
  if(highlightOption){
    const file=highlightOption.dataset.avatarHighlight;
    avatarSelection.eyeHighlight=avatarSelection.eyeHighlight===file?'':file;
    renderAvatar();
    renderDressOptions();
    return;
  }
  const option=e.target.closest('[data-avatar-file]');
  if(!option)return;
  const file=option.dataset.avatarFile;
  if(activeAvatarPart==='accessory'){
    if(!file)avatarSelection.accessory=[];
    else if(avatarSelection.accessory.includes(file))avatarSelection.accessory=avatarSelection.accessory.filter(accessory=>accessory!==file);
    else avatarSelection.accessory.push(file);
  }else avatarSelection[activeAvatarPart]=file;
  renderAvatar();
  renderDressOptions();
};

document.getElementById('dressOptions').oninput=e=>{
  const input=e.target.closest('[data-avatar-color-input]');
  if(!input)return;
  avatarColors[input.dataset.avatarColorInput]=input.value.toLowerCase();
  renderAvatar();
  document.querySelectorAll('[data-avatar-color]').forEach(button=>button.classList.remove('selected'));
};

document.getElementById('dressSave').onclick=()=>{
  const snapshot=createAvatarSnapshot();
  fallbackAvatar=snapshot;
  localStorage.setItem(avatarStorageKey,JSON.stringify(snapshot));
  const selectedDay=document.querySelector('#grid .day.selected[data-date]');
  if(selectedDay){
    avatarOutfits[selectedDay.dataset.date]={...snapshot,accessories:[...snapshot.accessories]};
    localStorage.setItem(avatarOutfitStorageKey,JSON.stringify(avatarOutfits));
  }
  document.getElementById('dressRoom').hidden=true;
  document.querySelector('main').classList.remove('dress-room-open');
};

document.getElementById('grid').addEventListener('click',event=>{
  const day=event.target.closest('.day[data-date]');
  if(!day||day.disabled)return;
  loadAvatarOutfit(day.dataset.date);
});

const initiallySelectedDay=document.querySelector('#grid .day.selected[data-date]');
if(initiallySelectedDay)loadAvatarOutfit(initiallySelectedDay.dataset.date);
else renderAvatar();
