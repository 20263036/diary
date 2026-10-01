(()=>{
  const storageKey='my-little-day-v3-calendar-events';

  const monthNames=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const $=id=>document.getElementById(id);
  const planner=$('monthlyPlanner');
  const grid=$('plannerGrid');
  const formPanel=$('plannerFormPanel');
  const detailPanel=$('plannerDetailPanel');
  const form=$('plannerForm');
  const pad=value=>String(value).padStart(2,'0');
  const dateKey=date=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  const dateFromKey=value=>{const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value||'');return match?new Date(Number(match[1]),Number(match[2])-1,Number(match[3])):null};
  const addDays=(date,amount)=>{const next=new Date(date);next.setDate(next.getDate()+amount);return next};
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const validDate=value=>{const date=dateFromKey(value);return date&&dateKey(date)===value};
  const eventEnd=event=>event.endDate||event.startDate;
  const isMultiDay=event=>Boolean(event.endDate&&event.endDate>event.startDate);
  const paletteIndex=id=>{let hash=0;for(const char of String(id)){hash=(hash*31+char.charCodeAt(0))>>>0}return hash%6};
  const paletteClass=event=>`planner-palette-${paletteIndex(event.id)}`;


  function normaliseEvent(value){
    if(!value||typeof value!=='object'||typeof value.title!=='string'||!value.title.trim()||!validDate(value.startDate))return null;
    const endDate=validDate(value.endDate)&&value.endDate>=value.startDate?value.endDate:'';
    return {
      id:typeof value.id==='string'&&value.id?value.id:`event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title:value.title.trim(),

      startDate:value.startDate,
      endDate,
      time:typeof value.time==='string'&&/^\d{2}:\d{2}$/.test(value.time)?value.time:''
    };
  }

  function loadEvents(){
    try{
      const saved=JSON.parse(localStorage.getItem(storageKey)||'null');
      return Array.isArray(saved?.events)?saved.events.map(normaliseEvent).filter(Boolean):[];
    }catch{return[]}
  }

  let events=loadEvents();
  let plannerYear=new Date().getFullYear();
  let plannerMonth=new Date().getMonth()+1;
  let editingId=null;
  let detailId=null;

  function saveEvents(){localStorage.setItem(storageKey,JSON.stringify({events}))}
  function eventById(id){return events.find(event=>event.id===id)}
  function closePanels(){formPanel.hidden=true;detailPanel.hidden=true;editingId=null;detailId=null}
  function eventId(){return globalThis.crypto?.randomUUID?.()||`event-${Date.now()}-${Math.random().toString(16).slice(2)}`}

  function weekSegments(weekStart,weekEnd){
    const laneEnds=[];
    return events.filter(event=>isMultiDay(event)&&eventEnd(event)>=weekStart&&event.startDate<=weekEnd)
      .map(event=>({event,start:event.startDate>weekStart?event.startDate:weekStart,end:eventEnd(event)<weekEnd?eventEnd(event):weekEnd}))
      .sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end)||a.event.title.localeCompare(b.event.title))
      .map(segment=>{
        let lane=laneEnds.findIndex(end=>end<segment.start);
        if(lane<0){lane=laneEnds.length;laneEnds.push(segment.end)}else laneEnds[lane]=segment.end;
        return {...segment,lane};
      });
  }

  function eventBlock(event){
    return `<button type="button" class="planner-single ${paletteClass(event)}" data-planner-event="${escapeHtml(event.id)}"><strong>${escapeHtml(event.title)}</strong>${event.time?`<small>${event.time}</small>`:''}</button>`;
  }

  function eventBar(segment){
    const startColumn=dateFromKey(segment.start).getDay()+1;
    const endColumn=dateFromKey(segment.end).getDay()+2;
    const event=segment.event;
    const startsHere=segment.start===event.startDate;
    const endsHere=segment.end===eventEnd(event);
    const left=(startColumn-1)*100/7;
    const width=(endColumn-startColumn)*100/7;
    return `<button type="button" class="planner-span ${paletteClass(event)} ${startsHere?'planner-span--start':'planner-span--continue'} ${endsHere?'planner-span--end':''}" data-planner-event="${escapeHtml(event.id)}" style="left:${left}%;width:${width}%;--planner-offset:${27+segment.lane*23}px"><b>${startsHere?'':'↪ '}${escapeHtml(event.title)}</b>${event.time?`<small>${event.time}</small>`:''}</button>`;
  }

  function renderPlanner(){
    $('plannerMonthLabel').textContent=`${monthNames[plannerMonth-1]} ${plannerYear}`;
    const first=new Date(plannerYear,plannerMonth-1,1);
    const gridStart=addDays(first,-first.getDay());
    let markup='';
    for(let week=0;week<6;week++){
      const weekStart=dateKey(addDays(gridStart,week*7));
      const weekEnd=dateKey(addDays(gridStart,week*7+6));
      const spans=weekSegments(weekStart,weekEnd);
      const barSpace=spans.length*23;
      let daysMarkup='';
      for(let day=0;day<7;day++){
        const date=addDays(gridStart,week*7+day);
        const key=dateKey(date);
        const singles=events.filter(event=>!isMultiDay(event)&&event.startDate===key);
        daysMarkup+=`<div class="planner-day ${date.getMonth()+1===plannerMonth?'':'planner-day--outside'}" data-date="${key}"><time datetime="${key}">${date.getDate()}</time><div class="planner-singles">${singles.map(eventBlock).join('')}</div></div>`;
      }
      markup+=`<div class="planner-week" style="--planner-bar-space:${barSpace}px">${daysMarkup}${spans.map(eventBar).join('')}</div>`;
    }
    grid.innerHTML=markup;
  }

  function openForm(startDate,event){
    detailPanel.hidden=true;
    editingId=event?.id||null;
    $('plannerFormTitle').textContent=event?'EDIT EVENT':'ADD EVENT';
    $('plannerEventTitle').value=event?.title||'';

    $('plannerEventStart').value=event?.startDate||startDate;
    $('plannerEventEnd').value=event?.endDate||'';
    $('plannerEventTime').value=event?.time||'';
    formPanel.hidden=false;
    $('plannerEventTitle').focus();
  }

  function openDetail(id){
    const event=eventById(id);
    if(!event)return;
    detailId=id;
    formPanel.hidden=true;
    $('plannerDetailTitle').textContent=event.title;
    $('plannerDetailMeta').innerHTML=`<p><b>START</b> ${event.startDate}</p>${event.endDate?`<p><b>END</b> ${event.endDate}</p>`:''}${event.time?`<p><b>TIME</b> ${event.time}</p>`:''}`;
    detailPanel.hidden=false;
  }

  function setPlannerMonthFromSmallCalendar(){
    const displayed=$('month').textContent.match(/^(\d{4})\.(\d{1,2})$/);
    if(displayed){plannerYear=Number(displayed[1]);plannerMonth=Number(displayed[2])}
  }

  $('plannerExpand').addEventListener('click',()=>{
    setPlannerMonthFromSmallCalendar();
    closePanels();
    planner.hidden=false;
    renderPlanner();
  });
  $('plannerClose').addEventListener('click',()=>{closePanels();planner.hidden=true});
  $('plannerPrev').addEventListener('click',()=>{if(--plannerMonth===0){plannerMonth=12;plannerYear--}renderPlanner()});
  $('plannerNext').addEventListener('click',()=>{if(++plannerMonth===13){plannerMonth=1;plannerYear++}renderPlanner()});

  grid.addEventListener('click',event=>{
    const eventButton=event.target.closest('[data-planner-event]');
    if(eventButton){event.stopPropagation();openDetail(eventButton.dataset.plannerEvent);return}
    const day=event.target.closest('.planner-day[data-date]');
    if(day)openForm(day.dataset.date);
  });

  form.addEventListener('submit',event=>{
    event.preventDefault();
    const title=$('plannerEventTitle').value.trim();
    const startDate=$('plannerEventStart').value;
    const enteredEnd=$('plannerEventEnd').value;
    if(!title||!validDate(startDate))return;
    if(enteredEnd&&(!validDate(enteredEnd)||enteredEnd<startDate)){window.alert('END DATE는 START DATE보다 빠를 수 없어요.');return}
    const value={id:editingId||eventId(),title,startDate,endDate:enteredEnd||'',time:$('plannerEventTime').value||''};
    if(editingId)events=events.map(event=>event.id===editingId?value:event);else events.push(value);
    saveEvents();
    closePanels();
    renderPlanner();
  });
  $('plannerFormCancel').addEventListener('click',closePanels);
  $('plannerDetailClose').addEventListener('click',closePanels);
  $('plannerDetailEdit').addEventListener('click',()=>{const event=eventById(detailId);if(event)openForm(event.startDate,event)});
  $('plannerDetailDelete').addEventListener('click',()=>{
    const event=eventById(detailId);
    if(!event||!window.confirm(`"${event.title}" 일정을 삭제할까요?`))return;
    events=events.filter(item=>item.id!==event.id);
    saveEvents();
    closePanels();
    renderPlanner();
  });
})();
